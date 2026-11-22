# EXO-SCAN v2 — Complete Streamlit Application
# Integrates HITE, Kopparapu HZ, Random Forest, and Three Ranking Systems

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import io

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Scientific modules — graceful import
try:
    from kopparapu_hz import add_habitable_zone_columns, classify_habitable_zone
    KOPPARAPU_AVAILABLE = True
except ImportError:
    KOPPARAPU_AVAILABLE = False

try:
    from hite_model import compute_hite_batch
    HITE_AVAILABLE = True
except ImportError:
    HITE_AVAILABLE = False

try:
    from ranking_engine import build_hite_ranking, build_kopparapu_ranking, build_integrated_ranking
    RANKING_AVAILABLE = True
except ImportError:
    RANKING_AVAILABLE = False


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="EXO-SCAN v2 | Exoplanet Intelligence",
    page_icon="🪐",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ============================================================
# CUSTOM CSS
# ============================================================

st.markdown("""
<style>

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

.stApp {
    background: #080b16;
}

[data-testid="stSidebar"] {
    background: #0d1120;
    border-right: 1px solid #252b40;
}

[data-testid="stSidebar"] * {
    color: #e8eaf2;
}

.hero {
    padding: 35px 40px;
    border-radius: 20px;
    background:
        radial-gradient(circle at 85% 20%, rgba(99,102,241,0.25), transparent 30%),
        radial-gradient(circle at 15% 80%, rgba(56,189,248,0.15), transparent 30%),
        #111629;
    border: 1px solid #29314a;
    margin-bottom: 25px;
}

.hero-title {
    font-size: 42px;
    font-weight: 800;
    margin-bottom: 8px;
    color: #ffffff;
}

.hero-subtitle {
    font-size: 17px;
    color: #aab2c8;
    line-height: 1.6;
}

.badge {
    display: inline-block;
    padding: 6px 13px;
    border-radius: 20px;
    background: #1b2440;
    color: #8fb8ff;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 15px;
}

.metric-card {
    background: #111629;
    border: 1px solid #29314a;
    border-radius: 15px;
    padding: 20px;
    min-height: 125px;
}

.metric-label {
    color: #8f98ad;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.7px;
}

.metric-value {
    color: #ffffff;
    font-size: 30px;
    font-weight: 800;
    margin-top: 10px;
}

.section-title {
    font-size: 25px;
    font-weight: 700;
    color: #ffffff;
    margin-top: 25px;
    margin-bottom: 15px;
}

.info-card {
    background: #101526;
    border: 1px solid #29314a;
    border-radius: 15px;
    padding: 22px;
    margin-bottom: 15px;
}

.info-title {
    color: #ffffff;
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
}

.info-text {
    color: #aab2c8;
    line-height: 1.7;
}

.priority-high {
    color: #ff8a8a;
    font-weight: 700;
}

.priority-medium {
    color: #ffd166;
    font-weight: 700;
}

.priority-low {
    color: #82d9a3;
    font-weight: 700;
}

.small-text {
    color: #8f98ad;
    font-size: 13px;
}

hr {
    border-color: #252b40;
}

</style>
""", unsafe_allow_html=True)


# ============================================================
# DATA LOADING (CACHED)
# ============================================================

@st.cache_data
def load_data():
    return pd.read_csv("cleankepler.csv")


@st.cache_data
def compute_kopparapu_results(_df):
    """Returns hz_df with all HZ columns."""
    if not KOPPARAPU_AVAILABLE:
        return _df.copy()
    return add_habitable_zone_columns(_df)


@st.cache_data
def compute_hite_results(_df):
    """Returns hite_results DataFrame."""
    if not HITE_AVAILABLE:
        return pd.DataFrame()
    return compute_hite_batch(_df)


# ============================================================
# CANDIDATE SCORING FUNCTIONS
# ============================================================

def range_score(value, low, ideal_low, ideal_high, high):
    """Converts a measurement into a score between 0 and 1."""
    if pd.isna(value):
        return 0
    if value < low or value > high:
        return 0
    if ideal_low <= value <= ideal_high:
        return 1
    if value < ideal_low:
        return (value - low) / (ideal_low - low)
    return (high - value) / (high - ideal_high)


def calculate_candidate_score(data):
    """Calculates a weighted screening score and priority label for every record."""
    result = data.copy()

    result["radius_score"] = result["koi_prad"].apply(
        lambda x: range_score(x, 0.3, 0.8, 1.8, 2.5)
    )

    result["temperature_score"] = result["koi_teq"].apply(
        lambda x: range_score(x, 180, 220, 320, 400)
    )

    result["flux_score"] = result["koi_insol"].apply(
        lambda x: range_score(x, 0.1, 0.25, 2.0, 4.0)
    )

    result["candidate_score"] = (
        0.40 * result["radius_score"]
        + 0.30 * result["temperature_score"]
        + 0.30 * result["flux_score"]
    ) * 100

    result["priority"] = pd.cut(
        result["candidate_score"],
        bins=[-1, 40, 70, 101],
        labels=["Low", "Medium", "High"]
    )

    return result


# ============================================================
# HITE HEATMAP HELPER
# ============================================================

def generate_hite_heatmap(l_star_solar, a_au, f_min, f_max):
    """Generate an albedo-eccentricity habitability grid."""
    SOLAR_LUMINOSITY = 3.828e26
    AU = 1.496e11
    ALBEDO_MIN = 0.05
    ALBEDO_MAX = 0.80
    ECC_MIN = 0.0
    ECC_MAX = 0.8
    GRID_STEP = 0.05

    albedos = np.arange(ALBEDO_MIN, ALBEDO_MAX + GRID_STEP / 2, GRID_STEP)
    eccs = np.arange(ECC_MIN, ECC_MAX + GRID_STEP / 2, GRID_STEP)
    l_w = l_star_solar * SOLAR_LUMINOSITY
    a_m = a_au * AU
    grid = np.zeros((len(albedos), len(eccs)))

    for i, A in enumerate(albedos):
        for j, e in enumerate(eccs):
            denom = 16 * np.pi * a_m**2 * np.sqrt(1 - e**2)
            if denom > 0:
                F = l_w * (1 - A) / denom
                grid[i, j] = 1.0 if f_min < F < f_max else 0.0

    return albedos, eccs, grid


# ============================================================
# LOAD DATA & PREPARE
# ============================================================

df = load_data()

# Kopparapu HZ results
hz_df = compute_kopparapu_results(df)

# Scientific features
scientific_features = [
    "koi_prad", "koi_teq", "koi_insol", "koi_period",
    "koi_sma", "koi_steff", "koi_srad", "koi_smass"
]
available_features = [x for x in scientific_features if x in df.columns]

# Model data
model_data = df.copy()
model_data[available_features] = model_data[available_features].replace([np.inf, -np.inf], np.nan)
model_data = model_data.dropna(subset=available_features + ["koi_disposition"])

# Scored data
scored_data = calculate_candidate_score(model_data)


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.markdown("""
    <div style="text-align:center; padding:15px 0 25px 0;">
        <div style="font-size:42px;">🪐</div>
        <div style="font-size:24px; font-weight:800; color:white;">
            EXO-SCAN
        </div>
        <div style="font-size:12px; color:#8f98ad;">
            Exoplanet Intelligence Platform v2
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    page = st.radio(
        "NAVIGATION",
        [
            "🏠 Dashboard",
            "🔬 HITE Analysis",
            "🌍 Habitable Zone",
            "🏆 Planet Ranking",
            "🤖 ML Analysis",
            "🔭 Planet Explorer",
            "⚖️ Planet Comparison",
            "📊 Explore Data",
            "📚 Methodology",
        ]
    )

    st.markdown("---")

    st.markdown(
        f"""
        <div class="small-text">
        DATASET<br>
        <b>{len(df):,}</b> records<br><br>
        FEATURES<br>
        <b>{len(df.columns)}</b> original variables<br><br>
        HITE MODULE<br>
        <b>{"✅ Available" if HITE_AVAILABLE else "⏳ Pending"}</b><br><br>
        KOPPARAPU HZ<br>
        <b>{"✅ Available" if KOPPARAPU_AVAILABLE else "⏳ Pending"}</b><br><br>
        RANKING ENGINE<br>
        <b>{"✅ Available" if RANKING_AVAILABLE else "⏳ Pending"}</b>
        </div>
        """,
        unsafe_allow_html=True
    )


# ============================================================
# PAGE 1 — DASHBOARD
# ============================================================

if page == "🏠 Dashboard":

    st.markdown("""
    <div class="hero">
        <div class="badge">AI-ASSISTED ASTRONOMICAL ANALYSIS · v2</div>
        <h1 style="color: white; font-size: 36px; font-weight: 800;">
            Exoplanet Intelligence Platform
        </h1>
        <p style="color: #aab2c8; font-size: 16px; line-height: 1.7;">
            An interactive machine-learning system integrating HITE scores,
            Kopparapu habitable-zone analysis, and three-tier candidate
            ranking for exoplanet habitability research.
        </p>
    </div>
    """, unsafe_allow_html=True)

    # KPI ROW
    total_planets = len(df)
    confirmed = (
        df["koi_disposition"].astype(str).str.upper().eq("CONFIRMED").sum()
    )
    candidates = (
        df["koi_disposition"].astype(str).str.upper().eq("CANDIDATE").sum()
    )
    high_priority = (
        scored_data["priority"].astype(str).eq("High").sum()
    )

    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Exoplanet Records</div>
            <div class="metric-value">{total_planets:,}</div>
        </div>
        """, unsafe_allow_html=True)

    with c2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Confirmed</div>
            <div class="metric-value">{confirmed:,}</div>
        </div>
        """, unsafe_allow_html=True)

    with c3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Candidates</div>
            <div class="metric-value">{candidates:,}</div>
        </div>
        """, unsafe_allow_html=True)

    with c4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">High Priority</div>
            <div class="metric-value">{high_priority:,}</div>
        </div>
        """, unsafe_allow_html=True)

    # Scientific Overview
    st.markdown('<div class="section-title">🔬 Scientific Overview</div>', unsafe_allow_html=True)

    col1, col2 = st.columns([1.4, 1])

    with col1:
        st.markdown("""
        <div class="info-card">
        <div class="info-title">What does EXO-SCAN do?</div>
        <div class="info-text">
        The system processes observed exoplanet and stellar characteristics
        such as planetary radius, equilibrium temperature, stellar flux and
        orbital properties.<br><br>
        Machine-learning techniques are used to identify patterns in the data,
        group similar planets and create a transparent candidate-prioritization
        score. Version 2 adds HITE scores and Kopparapu habitable-zone analysis.
        </div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown("""
        <div class="info-card">
        <div class="info-title">⚠️ Scientific Scope</div>
        <div class="info-text">
        This system does <b>not</b> detect extraterrestrial life.<br><br>
        The score represents a screening priority for further investigation
        based on selected observable characteristics.
        </div>
        </div>
        """, unsafe_allow_html=True)

    # Dataset Distribution
    st.markdown('<div class="section-title">📊 Dataset Distribution</div>', unsafe_allow_html=True)

    col1, col2 = st.columns(2)

    with col1:
        disposition_counts = df["koi_disposition"].value_counts()
        fig, ax = plt.subplots(figsize=(7, 4))
        disposition_counts.plot(kind="bar", ax=ax)
        ax.set_title("Exoplanet Disposition")
        ax.set_xlabel("")
        ax.set_ylabel("Number of Records")
        plt.xticks(rotation=0)
        st.pyplot(fig)
        plt.close()

    with col2:
        fig, ax = plt.subplots(figsize=(7, 4))
        sns.histplot(scored_data["candidate_score"], bins=25, kde=True, ax=ax)
        ax.set_title("Candidate Score Distribution")
        ax.set_xlabel("Candidate Score")
        ax.set_ylabel("Number of Planets")
        st.pyplot(fig)
        plt.close()

    # Scientific Analysis Summary
    st.markdown('<div class="section-title">🧬 Scientific Analysis Summary</div>', unsafe_allow_html=True)

    # Compute HZ stats
    if KOPPARAPU_AVAILABLE and "HZ_Classification" in hz_df.columns:
        conservative_count = int(
            (hz_df["HZ_Classification"] == "Within conservative habitable zone").sum()
        )
        optimistic_count = int(
            hz_df["HZ_Classification"].isin([
                "Within conservative habitable zone",
                "Inside inner boundary",
                "Beyond outer boundary"
            ]).sum()
        )
    else:
        conservative_count = "N/A"
        optimistic_count = "N/A"

    # HITE summary
    hite_results = compute_hite_results(df)
    if not hite_results.empty and "HITE_H" in hite_results.columns:
        hite_valid_count = int(hite_results["HITE_H"].notna().sum())
        top_hite_row = hite_results.dropna(subset=["HITE_H"]).sort_values("HITE_H", ascending=False)
        if not top_hite_row.empty:
            top_hite_name = str(top_hite_row.iloc[0].get("kepoi_name", "N/A"))
            top_hite_score = f"{top_hite_row.iloc[0]['HITE_H']:.4f}"
        else:
            top_hite_name = "N/A"
            top_hite_score = "N/A"
    else:
        hite_valid_count = "Computing..."
        top_hite_name = "Computing..."
        top_hite_score = "Computing..."

    s1, s2, s3, s4 = st.columns(4)

    with s1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Planets with HITE</div>
            <div class="metric-value">{hite_valid_count}</div>
        </div>
        """, unsafe_allow_html=True)

    with s2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Conservative HZ</div>
            <div class="metric-value">{conservative_count}</div>
        </div>
        """, unsafe_allow_html=True)

    with s3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Top HITE Candidate</div>
            <div class="metric-value" style="font-size:18px;">{top_hite_name}</div>
        </div>
        """, unsafe_allow_html=True)

    with s4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Top HITE Score</div>
            <div class="metric-value" style="font-size:22px;">{top_hite_score}</div>
        </div>
        """, unsafe_allow_html=True)

    # Top 5 Integrated Ranking
    st.markdown('<div class="section-title">🏆 Top Candidates Overview</div>', unsafe_allow_html=True)

    if RANKING_AVAILABLE:
        try:
            integrated_df = build_integrated_ranking(df, hz_df, hite_results)
            if not integrated_df.empty:
                st.dataframe(integrated_df.head(5), use_container_width=True, hide_index=True)
        except Exception as e:
            st.warning(f"Integrated ranking not available: {e}")
    else:
        # Fallback: show top 5 by candidate score
        top5_cols = [c for c in ["kepoi_name", "koi_prad", "koi_teq", "koi_insol", "candidate_score", "priority"] if c in scored_data.columns]
        top5 = scored_data.sort_values("candidate_score", ascending=False).head(5)[top5_cols]
        st.caption("Showing top candidates by candidate score (Integrated Ranking engine pending).")
        st.dataframe(top5, use_container_width=True, hide_index=True)


# ============================================================
# PAGE 2 — HITE ANALYSIS
# ============================================================

elif page == "🔬 HITE Analysis":

    st.markdown('<div class="section-title">🔬 HITE Analysis</div>', unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">Habitability Index for Transiting Exoplanets (HITE)</div>
    <div class="info-text">
    HITE is a quantitative habitability metric introduced by
    <b>Barnes, Meadows &amp; Evans (2015)</b>. It computes the fraction of
    (albedo, orbital eccentricity) parameter space for which a planet
    could maintain liquid surface water, given its measured transit
    parameters and host-star properties.<br><br>
    <b>HITE H</b> — computed directly from the transit light curve (no albedo
    assumption required).<br>
    <b>HITE H′</b> — computed assuming a specific Bond albedo (typically 0.3)
    and uses mass–radius relations to estimate planetary mass.<br><br>
    A higher HITE score indicates a larger fraction of parameter space
    consistent with liquid water. It is a <em>prioritization metric</em>,
    not proof of habitability.
    </div>
    </div>
    """, unsafe_allow_html=True)

    if not HITE_AVAILABLE:
        st.warning(
            "⏳ The HITE computation module (hite_model.py) is not yet available or "
            "does not export `compute_hite_batch`. HITE scores will appear here once "
            "the module is finalized."
        )
        st.info(
            "Once hite_model.py exports `compute_hite_batch(df)`, reload this page. "
            "Results are cached after the first computation."
        )
    else:
        st.info(
            "HITE computation runs on first load and is cached. "
            "This may take 1–2 minutes for the full dataset."
        )

        with st.spinner("Computing HITE scores for all planets..."):
            hite_results = compute_hite_results(df)

        if hite_results.empty:
            st.error("HITE computation returned an empty result. Check hite_model.py.")
        else:
            # DATA COVERAGE
            st.markdown('<div class="section-title">📊 Data Coverage</div>', unsafe_allow_html=True)

            total_p = len(hite_results)
            h_valid = int(hite_results["HITE_H"].notna().sum()) if "HITE_H" in hite_results.columns else 0
            mean_h = hite_results["HITE_H"].mean() if "HITE_H" in hite_results.columns else np.nan
            max_h = hite_results["HITE_H"].max() if "HITE_H" in hite_results.columns else np.nan

            dc1, dc2, dc3, dc4 = st.columns(4)

            dc1.metric("Total Planets", f"{total_p:,}")
            dc2.metric("With HITE H", f"{h_valid:,}")
            dc3.metric("Mean HITE H", f"{mean_h:.4f}" if np.isfinite(mean_h) else "N/A")
            dc4.metric("Max HITE H", f"{max_h:.4f}" if np.isfinite(max_h) else "N/A")

            # LEADERBOARDS
            st.markdown('<div class="section-title">🥇 HITE H Leaderboard (Top 20)</div>', unsafe_allow_html=True)

            if "HITE_H" in hite_results.columns:
                h_cols = [c for c in ["kepoi_name", "HITE_H", "rocky_probability", "calc_type"] if c in hite_results.columns]
                h_top20 = hite_results.dropna(subset=["HITE_H"]).sort_values("HITE_H", ascending=False).head(20)
                st.dataframe(h_top20[h_cols], use_container_width=True, hide_index=True)
            else:
                st.warning("HITE_H column not found in results.")

            st.markdown('<div class="section-title">🥈 HITE H′ Leaderboard (Top 20)</div>', unsafe_allow_html=True)

            if "HITE_H_prime" in hite_results.columns:
                hp_cols = [c for c in ["kepoi_name", "HITE_H_prime", "rocky_probability", "calc_type"] if c in hite_results.columns]
                hp_top20 = hite_results.dropna(subset=["HITE_H_prime"]).sort_values("HITE_H_prime", ascending=False).head(20)
                st.dataframe(hp_top20[hp_cols], use_container_width=True, hide_index=True)
            else:
                st.info("HITE H′ column not found in results.")

            # HITE H DISTRIBUTION HISTOGRAM
            st.markdown('<div class="section-title">📈 HITE H Distribution</div>', unsafe_allow_html=True)

            if "HITE_H" in hite_results.columns:
                h_values = hite_results["HITE_H"].dropna()
                fig_hist = px.histogram(
                    x=h_values,
                    nbins=50,
                    labels={"x": "HITE H Score"},
                    title="Distribution of HITE H Scores",
                    template="plotly_dark",
                    color_discrete_sequence=["#6366f1"]
                )
                fig_hist.update_layout(
                    plot_bgcolor="#111629",
                    paper_bgcolor="#111629",
                    font_color="#aab2c8"
                )
                st.plotly_chart(fig_hist, use_container_width=True)

            # HITE H vs INSOL SCATTER
            st.markdown('<div class="section-title">🌟 HITE H vs Stellar Flux</div>', unsafe_allow_html=True)

            if "HITE_H" in hite_results.columns and "koi_insol" in hite_results.columns:
                scatter_df = hite_results.dropna(subset=["HITE_H", "koi_insol"])
                color_col = "koi_disposition" if "koi_disposition" in scatter_df.columns else None
                fig_scatter = px.scatter(
                    scatter_df,
                    x="koi_insol",
                    y="HITE_H",
                    color=color_col,
                    hover_data=["kepoi_name"] if "kepoi_name" in scatter_df.columns else None,
                    labels={"koi_insol": "Stellar Insolation (Earth flux)", "HITE_H": "HITE H Score"},
                    title="HITE H Score vs Incident Stellar Flux",
                    template="plotly_dark",
                    opacity=0.7
                )
                fig_scatter.update_layout(
                    plot_bgcolor="#111629",
                    paper_bgcolor="#111629",
                    font_color="#aab2c8"
                )
                st.plotly_chart(fig_scatter, use_container_width=True)
            elif "koi_insol" not in hite_results.columns and "koi_insol" in df.columns:
                merged = hite_results.merge(df[["kepoi_name", "koi_insol"]], on="kepoi_name", how="left") if "kepoi_name" in hite_results.columns else hite_results
                scatter_df2 = merged.dropna(subset=["HITE_H", "koi_insol"]) if "HITE_H" in merged.columns and "koi_insol" in merged.columns else pd.DataFrame()
                if not scatter_df2.empty:
                    fig_scatter2 = px.scatter(
                        scatter_df2,
                        x="koi_insol",
                        y="HITE_H",
                        labels={"koi_insol": "Stellar Insolation (Earth flux)", "HITE_H": "HITE H Score"},
                        title="HITE H Score vs Incident Stellar Flux",
                        template="plotly_dark",
                        opacity=0.7
                    )
                    fig_scatter2.update_layout(
                        plot_bgcolor="#111629",
                        paper_bgcolor="#111629",
                        font_color="#aab2c8"
                    )
                    st.plotly_chart(fig_scatter2, use_container_width=True)

            # INDIVIDUAL PLANET HITE DETAIL
            st.markdown('<div class="section-title">🔍 Individual Planet HITE Detail</div>', unsafe_allow_html=True)

            planet_col = "kepoi_name" if "kepoi_name" in hite_results.columns else None

            if planet_col:
                planet_options = sorted(hite_results[planet_col].dropna().unique().tolist())
                selected_hite_planet = st.selectbox("Select planet for HITE detail", planet_options, key="hite_detail_select")
                planet_hite_row = hite_results[hite_results[planet_col] == selected_hite_planet]

                if not planet_hite_row.empty:
                    row = planet_hite_row.iloc[0]
                    st.dataframe(row.to_frame(name="Value"), use_container_width=True)

                    # Albedo-eccentricity heatmap
                    st.markdown("**Albedo–Eccentricity Habitability Map**")

                    l_star_col = "l_star_solar" if "l_star_solar" in hite_results.columns else None
                    a_au_col = "koi_sma" if "koi_sma" in hite_results.columns else None
                    f_min_col = "f_min" if "f_min" in hite_results.columns else None
                    f_max_col = "f_max" if "f_max" in hite_results.columns else None

                    # Try to get luminosity from df if not in hite_results
                    if l_star_col is None:
                        df_row = df[df["kepoi_name"] == selected_hite_planet] if "kepoi_name" in df.columns else pd.DataFrame()
                        if not df_row.empty:
                            srad = df_row.iloc[0].get("koi_srad", np.nan)
                            steff = df_row.iloc[0].get("koi_steff", np.nan)
                            if np.isfinite(srad) and np.isfinite(steff):
                                l_star_solar_val = (srad ** 2) * ((steff / 5778) ** 4)
                            else:
                                l_star_solar_val = np.nan
                        else:
                            l_star_solar_val = np.nan
                    else:
                        l_star_solar_val = row.get(l_star_col, np.nan)

                    if a_au_col:
                        a_au_val = row.get(a_au_col, np.nan)
                        if np.isnan(a_au_val) and "koi_sma" in df.columns and "kepoi_name" in df.columns:
                            df_row2 = df[df["kepoi_name"] == selected_hite_planet]
                            a_au_val = df_row2.iloc[0]["koi_sma"] if not df_row2.empty else np.nan
                    else:
                        a_au_val = np.nan

                    f_min_val = row.get(f_min_col, np.nan) if f_min_col else np.nan
                    f_max_val = row.get(f_max_col, np.nan) if f_max_col else np.nan

                    if all(np.isfinite(v) for v in [l_star_solar_val, a_au_val, f_min_val, f_max_val]):
                        albedos, eccs, grid = generate_hite_heatmap(
                            l_star_solar_val, a_au_val, f_min_val, f_max_val
                        )
                        fig_hm = go.Figure(data=go.Heatmap(
                            z=grid,
                            x=eccs.round(2),
                            y=albedos.round(2),
                            colorscale=[[0, "#1a1a2e"], [1, "#06d6a0"]],
                            showscale=True,
                            colorbar=dict(
                                title="Habitable",
                                tickvals=[0, 1],
                                ticktext=["No", "Yes"]
                            )
                        ))
                        fig_hm.update_layout(
                            title=f"Albedo–Eccentricity Habitability: {selected_hite_planet}",
                            xaxis_title="Orbital Eccentricity",
                            yaxis_title="Bond Albedo",
                            template="plotly_dark",
                            plot_bgcolor="#111629",
                            paper_bgcolor="#111629",
                            font_color="#aab2c8"
                        )
                        st.plotly_chart(fig_hm, use_container_width=True)
                    else:
                        st.info("Not enough data to render the albedo–eccentricity heatmap for this planet.")
            else:
                st.warning("Planet identifier column not found in HITE results.")

            # DOWNLOAD BUTTON
            st.markdown('<div class="section-title">⬇️ Download HITE Results</div>', unsafe_allow_html=True)
            csv_hite = hite_results.to_csv(index=False).encode("utf-8")
            st.download_button(
                label="Download HITE Results as CSV",
                data=csv_hite,
                file_name="hite_results.csv",
                mime="text/csv"
            )


# ============================================================
# PAGE 3 — HABITABLE ZONE
# ============================================================

elif page == "🌍 Habitable Zone":

    st.markdown('<div class="section-title">🌍 Kopparapu Habitable-Zone Analysis</div>', unsafe_allow_html=True)

    st.write("""
    This page applies the published Kopparapu et al. (2014)
    one-Earth-mass model to estimate conservative habitable-zone
    boundaries based on host-star effective temperature.

    These boundaries are a scientific screening tool. They do not
    establish whether a planet is habitable or supports life.
    """)

    if not KOPPARAPU_AVAILABLE:
        st.warning("Kopparapu HZ module is not available. Install kopparapu_hz.py to enable this page.")
    else:
        # Classification counts
        st.subheader("Habitable-Zone Classifications")

        classification_counts = (
            hz_df["HZ_Classification"]
            .value_counts()
            .rename_axis("Classification")
            .reset_index(name="Number of Objects")
        )

        col1, col2 = st.columns([1, 1])

        with col1:
            st.dataframe(classification_counts, use_container_width=True, hide_index=True)

        with col2:
            fig_hz_bar = px.bar(
                classification_counts,
                x="Classification",
                y="Number of Objects",
                title="Planet Count by HZ Classification",
                template="plotly_dark",
                color="Number of Objects",
                color_continuous_scale="Viridis"
            )
            fig_hz_bar.update_layout(
                plot_bgcolor="#111629",
                paper_bgcolor="#111629",
                font_color="#aab2c8",
                xaxis_tickangle=-20
            )
            st.plotly_chart(fig_hz_bar, use_container_width=True)

        # Conservative vs Optimistic Comparison
        st.markdown('<div class="section-title">🔄 Conservative vs Optimistic HZ</div>', unsafe_allow_html=True)

        conservative_mask = hz_df["HZ_Classification"] == "Within conservative habitable zone"
        inside_inner_mask = hz_df["HZ_Classification"] == "Inside inner boundary"
        beyond_outer_mask = hz_df["HZ_Classification"] == "Beyond outer boundary"

        conservative_n = int(conservative_mask.sum())
        # Optimistic = conservative + inner edge + outer edge planets within a relaxed boundary
        optimistic_inner = int(inside_inner_mask.sum())
        optimistic_outer = int(beyond_outer_mask.sum())

        comp_df = pd.DataFrame({
            "Zone Type": ["Conservative HZ", "Inside Inner Boundary", "Beyond Outer Boundary", "Outside Temp Range"],
            "Count": [
                conservative_n,
                optimistic_inner,
                optimistic_outer,
                int((hz_df["HZ_Classification"] == "Outside model temperature range").sum())
            ]
        })

        fig_comp = px.bar(
            comp_df,
            x="Zone Type",
            y="Count",
            title="Conservative vs Outer-Zone Planet Counts",
            template="plotly_dark",
            color="Zone Type",
            color_discrete_sequence=["#06d6a0", "#ff6b6b", "#ffd166", "#8f98ad"]
        )
        fig_comp.update_layout(
            plot_bgcolor="#111629",
            paper_bgcolor="#111629",
            font_color="#aab2c8",
            showlegend=False
        )
        st.plotly_chart(fig_comp, use_container_width=True)

        # HZ Diagram: stellar temp vs orbital distance
        st.markdown('<div class="section-title">🌐 HZ Diagram: Stellar Temperature vs Orbital Distance</div>', unsafe_allow_html=True)

        if "koi_sma" in hz_df.columns and "koi_steff" in hz_df.columns:
            hz_plot_df = hz_df.dropna(subset=["koi_sma", "koi_steff", "HZ_Classification"])
            fig_hz_diag = px.scatter(
                hz_plot_df,
                x="koi_steff",
                y="koi_sma",
                color="HZ_Classification",
                hover_data=["kepoi_name"] if "kepoi_name" in hz_plot_df.columns else None,
                labels={
                    "koi_steff": "Stellar Effective Temperature (K)",
                    "koi_sma": "Semi-Major Axis (AU)"
                },
                title="HZ Classification by Stellar Temperature and Orbital Distance",
                template="plotly_dark",
                opacity=0.7,
                color_discrete_map={
                    "Within conservative habitable zone": "#06d6a0",
                    "Inside inner boundary": "#ff6b6b",
                    "Beyond outer boundary": "#ffd166",
                    "Outside model temperature range": "#8f98ad",
                    "Invalid data": "#333344"
                }
            )
            fig_hz_diag.update_layout(
                plot_bgcolor="#111629",
                paper_bgcolor="#111629",
                font_color="#aab2c8"
            )
            st.plotly_chart(fig_hz_diag, use_container_width=True)

        # Filter & Explore
        st.subheader("Explore Objects")

        classifications = sorted(hz_df["HZ_Classification"].dropna().unique())
        selected_classification = st.selectbox("Habitable-zone classification", classifications)

        dispositions = ["All"] + sorted(hz_df["koi_disposition"].dropna().astype(str).unique())
        selected_disposition = st.selectbox("Planet disposition", dispositions)

        filtered_df = hz_df[hz_df["HZ_Classification"] == selected_classification]

        if selected_disposition != "All":
            filtered_df = filtered_df[filtered_df["koi_disposition"].astype(str) == selected_disposition]

        display_columns = [
            "kepoi_name", "koi_steff", "koi_insol",
            "HZ_Inner_Flux", "HZ_Outer_Flux", "HZ_Classification", "koi_disposition"
        ]
        available_columns = [c for c in display_columns if c in filtered_df.columns]

        st.write(f"**Objects matching your filters:** {len(filtered_df):,}")
        st.dataframe(filtered_df[available_columns], use_container_width=True, hide_index=True)

        # Show Conservative HZ table with export
        st.markdown('<div class="section-title">✅ Planets in Conservative Habitable Zone</div>', unsafe_allow_html=True)

        cons_hz = hz_df[hz_df["HZ_Classification"] == "Within conservative habitable zone"]
        cons_hz_cols = [c for c in ["kepoi_name", "koi_steff", "koi_insol", "koi_sma", "koi_prad", "HZ_Inner_Flux", "HZ_Outer_Flux", "koi_disposition"] if c in cons_hz.columns]
        st.write(f"Found **{len(cons_hz):,}** planets in the conservative habitable zone.")
        st.dataframe(cons_hz[cons_hz_cols], use_container_width=True, hide_index=True)

        cons_csv = cons_hz[cons_hz_cols].to_csv(index=False).encode("utf-8")
        st.download_button(
            label="Export Conservative HZ Planets as CSV",
            data=cons_csv,
            file_name="conservative_hz_planets.csv",
            mime="text/csv"
        )

        st.caption(
            "The model is applied only to host-star temperatures between "
            "2600 K and 7200 K. Objects outside this range are retained "
            "but are not classified using these boundaries."
        )


# ============================================================
# PAGE 4 — PLANET RANKING
# ============================================================

elif page == "🏆 Planet Ranking":

    st.markdown('<div class="section-title">🏆 Planet Ranking Systems</div>', unsafe_allow_html=True)

    st.write("""
    Three complementary ranking systems are provided to prioritize exoplanet
    candidates for further habitability research. Each system uses different
    scientific criteria and should be interpreted in context.
    """)

    tab_a, tab_b, tab_c = st.tabs(["🔬 HITE Ranking", "🌍 Kopparapu Ranking", "⚡ Integrated Ranking"])

    # ---- TAB A: HITE RANKING ----
    with tab_a:
        st.markdown("### 🔬 HITE-Based Planet Ranking")
        st.write("Planets ranked by their HITE H score — the fraction of (albedo, eccentricity) space consistent with liquid surface water.")

        if not HITE_AVAILABLE:
            st.warning("HITE module not yet available. Rankings will appear here once hite_model.py exports `compute_hite_batch`.")
        else:
            with st.spinner("Loading HITE results..."):
                hite_results = compute_hite_results(df)

            if hite_results.empty:
                st.error("HITE computation returned no results.")
            else:
                if RANKING_AVAILABLE:
                    try:
                        hite_rank_df = build_hite_ranking(hite_results)
                    except Exception as e:
                        st.warning(f"Ranking engine error: {e}. Using fallback ranking.")
                        hite_rank_df = None
                else:
                    hite_rank_df = None

                # Fallback ranking
                if hite_rank_df is None:
                    if "HITE_H" in hite_results.columns:
                        hite_rank_df = hite_results.dropna(subset=["HITE_H"]).sort_values("HITE_H", ascending=False).reset_index(drop=True)
                        hite_rank_df.insert(0, "HITE_Rank", range(1, len(hite_rank_df) + 1))
                    else:
                        hite_rank_df = pd.DataFrame()

                if not hite_rank_df.empty:
                    ra1, ra2 = st.columns([1, 1])
                    with ra1:
                        top_n_h = st.slider("Number of planets to display", 10, min(len(hite_rank_df), 200), 20, key="hite_rank_slider")
                    with ra2:
                        if "calc_type" in hite_rank_df.columns:
                            calc_types = ["All"] + sorted(hite_rank_df["calc_type"].dropna().unique().tolist())
                            selected_calc = st.selectbox("Filter by calc_type", calc_types, key="hite_calc_filter")
                        else:
                            selected_calc = "All"

                    filtered_hite = hite_rank_df.copy()
                    if selected_calc != "All" and "calc_type" in filtered_hite.columns:
                        filtered_hite = filtered_hite[filtered_hite["calc_type"] == selected_calc]

                    display_h_cols = [c for c in ["HITE_Rank", "kepoi_name", "HITE_H", "HITE_H_prime", "rocky_probability", "calc_type"] if c in filtered_hite.columns]
                    st.dataframe(filtered_hite[display_h_cols].head(top_n_h), use_container_width=True, hide_index=True)

                    # Bar chart top 20
                    if "HITE_H" in filtered_hite.columns and "kepoi_name" in filtered_hite.columns:
                        top20_h = filtered_hite.dropna(subset=["HITE_H"]).head(20)
                        fig_h_bar = px.bar(
                            top20_h,
                            x="kepoi_name",
                            y="HITE_H",
                            title="Top 20 HITE H Scores",
                            template="plotly_dark",
                            color="HITE_H",
                            color_continuous_scale="Viridis"
                        )
                        fig_h_bar.update_layout(
                            plot_bgcolor="#111629",
                            paper_bgcolor="#111629",
                            font_color="#aab2c8",
                            xaxis_tickangle=-45
                        )
                        st.plotly_chart(fig_h_bar, use_container_width=True)

                    # Download
                    hite_csv = filtered_hite[display_h_cols].to_csv(index=False).encode("utf-8")
                    st.download_button(
                        "Download HITE Ranking as CSV",
                        hite_csv,
                        "hite_ranking.csv",
                        "text/csv",
                        key="download_hite_rank"
                    )

                    # Planets with insufficient data
                    st.markdown("#### ⚠️ Planets with Insufficient Data for HITE")
                    if "HITE_H" in hite_results.columns:
                        insufficient = hite_results[hite_results["HITE_H"].isna()]
                        st.write(f"{len(insufficient):,} planets could not be scored due to missing transit parameters.")
                        if not insufficient.empty and "kepoi_name" in insufficient.columns:
                            st.dataframe(insufficient[["kepoi_name"]].head(50), use_container_width=True, hide_index=True)

    # ---- TAB B: KOPPARAPU RANKING ----
    with tab_b:
        st.markdown("### 🌍 Kopparapu Habitable-Zone Ranking")
        st.write("Planets ranked and classified by their position relative to the Kopparapu (2014) conservative habitable-zone boundaries.")

        if not KOPPARAPU_AVAILABLE:
            st.warning("Kopparapu HZ module not available.")
        else:
            if RANKING_AVAILABLE:
                try:
                    kop_rank_df = build_kopparapu_ranking(hz_df)
                except Exception as e:
                    st.warning(f"Ranking engine error: {e}. Using fallback.")
                    kop_rank_df = None
            else:
                kop_rank_df = None

            # Fallback Kopparapu ranking
            if kop_rank_df is None:
                kop_priority = {
                    "Within conservative habitable zone": 1,
                    "Inside inner boundary": 2,
                    "Beyond outer boundary": 3,
                    "Outside model temperature range": 4,
                    "Invalid data": 5
                }
                kop_rank_df = hz_df.copy()
                kop_rank_df["_sort_key"] = kop_rank_df["HZ_Classification"].map(kop_priority).fillna(6)
                if "koi_insol" in kop_rank_df.columns:
                    kop_rank_df = kop_rank_df.sort_values(["_sort_key", "koi_insol"])
                else:
                    kop_rank_df = kop_rank_df.sort_values("_sort_key")
                kop_rank_df.insert(0, "Kopparapu_Rank", range(1, len(kop_rank_df) + 1))
                kop_rank_df = kop_rank_df.drop(columns=["_sort_key"])

            kop_disp_cols = [c for c in [
                "Kopparapu_Rank", "kepoi_name", "HZ_Classification",
                "HZ_Inner_Flux", "HZ_Outer_Flux", "koi_sma", "koi_insol", "koi_disposition"
            ] if c in kop_rank_df.columns]

            st.dataframe(kop_rank_df[kop_disp_cols].head(100), use_container_width=True, hide_index=True)

            # Bar chart: count per classification
            if "HZ_Classification" in kop_rank_df.columns:
                class_counts = kop_rank_df["HZ_Classification"].value_counts().reset_index()
                class_counts.columns = ["Classification", "Count"]
                fig_kop = px.bar(
                    class_counts,
                    x="Classification",
                    y="Count",
                    title="Planet Count per HZ Classification",
                    template="plotly_dark",
                    color="Classification",
                    color_discrete_map={
                        "Within conservative habitable zone": "#06d6a0",
                        "Inside inner boundary": "#ff6b6b",
                        "Beyond outer boundary": "#ffd166",
                        "Outside model temperature range": "#8f98ad",
                        "Invalid data": "#333344"
                    }
                )
                fig_kop.update_layout(
                    plot_bgcolor="#111629",
                    paper_bgcolor="#111629",
                    font_color="#aab2c8",
                    showlegend=False,
                    xaxis_tickangle=-15
                )
                st.plotly_chart(fig_kop, use_container_width=True)

            kop_csv = kop_rank_df[kop_disp_cols].to_csv(index=False).encode("utf-8")
            st.download_button(
                "Download Kopparapu Ranking as CSV",
                kop_csv,
                "kopparapu_ranking.csv",
                "text/csv",
                key="download_kop_rank"
            )

    # ---- TAB C: INTEGRATED RANKING ----
    with tab_c:
        st.markdown("### ⚡ Integrated Ranking")

        st.warning(
            "⚠️ **Disclaimer**: This is a project-specific prioritisation framework, "
            "not a published scientific model. Rankings combine HITE scores, "
            "Kopparapu HZ classification, and the candidate screening score. "
            "They should not be interpreted as scientific consensus on habitability."
        )

        if RANKING_AVAILABLE:
            try:
                hite_results_int = compute_hite_results(df)
                integrated_df = build_integrated_ranking(df, hz_df, hite_results_int)
            except Exception as e:
                st.warning(f"Ranking engine error: {e}. Falling back to candidate score ranking.")
                integrated_df = None
        else:
            integrated_df = None

        # Fallback integrated ranking using existing candidate score + HZ
        if integrated_df is None:
            st.info("Ranking engine (ranking_engine.py) not available. Showing candidate-score-based ranking.")
            integrated_df = scored_data.copy()
            if KOPPARAPU_AVAILABLE and "HZ_Classification" in hz_df.columns:
                hz_subset = hz_df[["kepoi_name", "HZ_Classification"]].drop_duplicates("kepoi_name") if "kepoi_name" in hz_df.columns else pd.DataFrame()
                if not hz_subset.empty:
                    integrated_df = integrated_df.merge(hz_subset, on="kepoi_name", how="left")

            # Assign priority group
            def assign_group(row):
                score = row.get("candidate_score", 0)
                hz = str(row.get("HZ_Classification", ""))
                if score >= 70 and "conservative" in hz.lower():
                    return "A"
                elif score >= 70:
                    return "B"
                elif score >= 40 and "conservative" in hz.lower():
                    return "C"
                elif score >= 40:
                    return "D"
                elif "conservative" in hz.lower():
                    return "E"
                else:
                    return "F"

            integrated_df["Priority_Group"] = integrated_df.apply(assign_group, axis=1)
            integrated_df = integrated_df.sort_values(["Priority_Group", "candidate_score"], ascending=[True, False]).reset_index(drop=True)
            integrated_df.insert(0, "Integrated_Rank", range(1, len(integrated_df) + 1))

            group_labels = {
                "A": "A — High Score + Conservative HZ",
                "B": "B — High Score, Any HZ",
                "C": "C — Medium Score + Conservative HZ",
                "D": "D — Medium Score, Any HZ",
                "E": "E — Low Score + Conservative HZ",
                "F": "F — Low Score, Any HZ"
            }
            integrated_df["Priority_Group_Label"] = integrated_df["Priority_Group"].map(group_labels)

        # Group counts
        if "Priority_Group" in integrated_df.columns:
            group_counts = integrated_df["Priority_Group"].value_counts().sort_index()
            gc1, gc2, gc3, gc4, gc5, gc6 = st.columns(6)
            cols_gc = [gc1, gc2, gc3, gc4, gc5, gc6]
            for i, g in enumerate(["A", "B", "C", "D", "E", "F"]):
                count = int(group_counts.get(g, 0))
                cols_gc[i].metric(f"Group {g}", count)

        int_disp_cols = [c for c in [
            "Integrated_Rank", "kepoi_name", "Priority_Group", "Priority_Group_Label",
            "candidate_score", "HZ_Classification", "koi_prad", "koi_teq", "koi_insol"
        ] if c in integrated_df.columns]

        st.dataframe(integrated_df[int_disp_cols].head(200), use_container_width=True, hide_index=True)

        int_csv = integrated_df[int_disp_cols].to_csv(index=False).encode("utf-8")
        st.download_button(
            "Download Integrated Ranking as CSV",
            int_csv,
            "integrated_ranking.csv",
            "text/csv",
            key="download_int_rank"
        )


# ============================================================
# PAGE 5 — ML ANALYSIS
# ============================================================

elif page == "🤖 ML Analysis":

    st.markdown('<div class="section-title">🤖 Random Forest Classification</div>', unsafe_allow_html=True)

    st.write("""
    A Random Forest classifier is used to learn patterns in
    the observed exoplanet dataset and predict the recorded
    disposition category.
    """)

    X = model_data[available_features]
    y = model_data["koi_disposition"]

    counts = y.value_counts()
    valid_labels = counts[counts >= 10].index

    X = X[y.isin(valid_labels)]
    y = y[y.isin(valid_labels)]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    predictions = model.predict(X_test_scaled)

    accuracy = accuracy_score(y_test, predictions)

    c1, c2, c3 = st.columns(3)
    c1.metric("Model", "Random Forest")
    c2.metric("Test Accuracy", f"{accuracy * 100:.2f}%")
    c3.metric("Trees", "100")

    st.markdown('<div class="section-title">Confusion Matrix</div>', unsafe_allow_html=True)

    labels = sorted(y.unique())
    cm = confusion_matrix(y_test, predictions, labels=labels)

    fig, ax = plt.subplots(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt="d", xticklabels=labels, yticklabels=labels, cmap="Blues", ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    st.pyplot(fig)
    plt.close()

    st.markdown('<div class="section-title">Feature Importance</div>', unsafe_allow_html=True)

    importance = pd.DataFrame({
        "Feature": available_features,
        "Importance": model.feature_importances_
    }).sort_values("Importance", ascending=False)

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.barh(importance["Feature"], importance["Importance"])
    ax.invert_yaxis()
    ax.set_xlabel("Importance")
    ax.set_title("Random Forest Feature Importance")
    st.pyplot(fig)
    plt.close()

    st.markdown('<div class="section-title">Classification Report</div>', unsafe_allow_html=True)

    report = classification_report(y_test, predictions, output_dict=True)
    report_df = pd.DataFrame(report).transpose()
    st.dataframe(report_df.round(3), use_container_width=True)


# ============================================================
# PAGE 6 — PLANET EXPLORER
# ============================================================

elif page == "🔭 Planet Explorer":

    st.markdown('<div class="section-title">🔭 Individual Planet Explorer</div>', unsafe_allow_html=True)

    if "kepoi_name" not in scored_data.columns:
        st.error("The dataset does not contain the 'kepoi_name' column.")
    else:
        planets = sorted(scored_data["kepoi_name"].dropna().unique())
        selected_planet = st.selectbox("Select an exoplanet", planets, key="explorer_planet_select")

        planet = scored_data[scored_data["kepoi_name"] == selected_planet].iloc[0]

        st.markdown("---")
        st.caption("🪐 PLANET PROFILE")
        st.title(str(selected_planet))

        profile_col1, profile_col2 = st.columns(2)

        with profile_col1:
            st.metric("Candidate Score", f"{planet['candidate_score']:.1f}/100")

        with profile_col2:
            st.metric("Priority", str(planet["priority"]))

        st.markdown("---")

        # Planetary Characteristics
        st.subheader("🌍 Planetary Characteristics")

        properties = [
            ("Planet Radius (R⊕)", "koi_prad"),
            ("Equilibrium Temperature (K)", "koi_teq"),
            ("Stellar Insolation (F⊕)", "koi_insol"),
            ("Orbital Period (days)", "koi_period")
        ]

        cols = st.columns(4)
        for col, (label, feature) in zip(cols, properties):
            with col:
                value = planet.get(feature, np.nan)
                display_value = "N/A" if pd.isna(value) else f"{value:,.3f}"
                st.metric(label=label, value=display_value)

        # Complete planet information
        st.subheader("📋 Complete Planet Information")
        details = planet[available_features].to_frame(name="Value")
        details.index.name = "Feature"
        st.dataframe(details, use_container_width=True)

        # Data completeness indicator
        st.markdown("---")
        completeness_cols = available_features + ["koi_depth", "koi_duration", "koi_impact", "koi_slogg"]
        all_cols_present = [c for c in completeness_cols if c in df.columns]
        planet_full_row = df[df["kepoi_name"] == selected_planet]
        if not planet_full_row.empty:
            full_row = planet_full_row.iloc[0]
            non_null = sum(1 for c in all_cols_present if pd.notna(full_row.get(c, np.nan)))
            completeness_pct = int(100 * non_null / len(all_cols_present)) if all_cols_present else 0
            st.markdown(f"**Data Completeness:** {completeness_pct}% ({non_null}/{len(all_cols_present)} fields present)")
            st.progress(completeness_pct / 100)

        # HITE Section
        st.markdown("---")
        st.subheader("🔬 HITE Analysis for This Planet")

        if not HITE_AVAILABLE:
            st.info("HITE module not yet available. HITE scores will appear here once hite_model.py is finalized.")
        else:
            with st.spinner("Loading HITE results..."):
                hite_results = compute_hite_results(df)

            if hite_results.empty:
                st.warning("HITE computation returned no results.")
            else:
                planet_hite = hite_results[hite_results.get("kepoi_name", pd.Series()) == selected_planet] if "kepoi_name" in hite_results.columns else pd.DataFrame()

                if not planet_hite.empty:
                    hite_row = planet_hite.iloc[0]
                    hite_h_val = hite_row.get("HITE_H", np.nan)
                    hite_hp_val = hite_row.get("HITE_H_prime", np.nan)
                    calc_type_val = hite_row.get("calc_type", "N/A")
                    rocky_prob_val = hite_row.get("rocky_probability", np.nan)
                    e_min_val = hite_row.get("e_min", np.nan)
                    f_min_val = hite_row.get("f_min", np.nan)
                    f_max_val = hite_row.get("f_max", np.nan)

                    hc1, hc2, hc3, hc4 = st.columns(4)
                    hc1.metric("HITE H", f"{hite_h_val:.4f}" if np.isfinite(float(hite_h_val or 0)) else "N/A")
                    hc2.metric("HITE H′", f"{hite_hp_val:.4f}" if pd.notna(hite_hp_val) and np.isfinite(float(hite_hp_val)) else "N/A")
                    hc3.metric("Calc Type", str(calc_type_val))
                    hc4.metric("Rocky Probability", f"{rocky_prob_val:.2%}" if pd.notna(rocky_prob_val) and np.isfinite(float(rocky_prob_val)) else "N/A")

                    hc5, hc6, hc7 = st.columns(3)
                    hc5.metric("e_min", f"{e_min_val:.4f}" if pd.notna(e_min_val) and np.isfinite(float(e_min_val)) else "N/A")
                    hc6.metric("f_min (W/m²)", f"{f_min_val:.2f}" if pd.notna(f_min_val) and np.isfinite(float(f_min_val)) else "N/A")
                    hc7.metric("f_max (W/m²)", f"{f_max_val:.2f}" if pd.notna(f_max_val) and np.isfinite(float(f_max_val)) else "N/A")

                    # HITE equations for this planet
                    st.markdown("**Equations used for this planet's HITE calculation:**")

                    st.latex(r"R_p = \sqrt{\delta} \cdot R_\star \quad \text{(from transit depth } \delta \text{ and stellar radius)}")
                    st.latex(r"L_\star = R_\star^2 \cdot \left(\frac{T_\star}{T_\odot}\right)^4 \quad \text{(stellar luminosity in solar units)}")
                    st.latex(r"F = \frac{L_\star \,(1-A)}{16\pi\, a^2 \sqrt{1-e^2}} \quad \text{(time-averaged flux at planet)}")
                    st.latex(r"H = \frac{\text{Area habitable}(A,e)}{\text{Total area}} \quad \text{(HITE score as fraction of parameter space)}")

                else:
                    st.info(f"No HITE result found for {selected_planet} — this planet may have insufficient transit data.")

        # Kopparapu Section
        st.markdown("---")
        st.subheader("🌍 Kopparapu HZ Analysis for This Planet")

        if not KOPPARAPU_AVAILABLE:
            st.info("Kopparapu HZ module not available.")
        else:
            planet_hz = hz_df[hz_df["kepoi_name"] == selected_planet] if "kepoi_name" in hz_df.columns else pd.DataFrame()

            if not planet_hz.empty:
                hz_row = planet_hz.iloc[0]
                hz_class = hz_row.get("HZ_Classification", "N/A")
                hz_inner = hz_row.get("HZ_Inner_Flux", np.nan)
                hz_outer = hz_row.get("HZ_Outer_Flux", np.nan)
                sma_val = hz_row.get("koi_sma", np.nan)

                in_cons = hz_class == "Within conservative habitable zone"

                kc1, kc2, kc3 = st.columns(3)
                kc1.metric("HZ Classification", hz_class)
                kc2.metric("In Conservative HZ", "✅ Yes" if in_cons else "❌ No")
                kc3.metric("Semi-Major Axis (AU)", f"{sma_val:.4f}" if pd.notna(sma_val) else "N/A")

                kc4, kc5 = st.columns(2)
                kc4.metric("Inner Flux Limit (F⊕)", f"{hz_inner:.4f}" if pd.notna(hz_inner) else "N/A")
                kc5.metric("Outer Flux Limit (F⊕)", f"{hz_outer:.4f}" if pd.notna(hz_outer) else "N/A")
            else:
                st.info("No Kopparapu HZ data found for this planet.")

        # Integrated ranking position
        st.markdown("---")
        st.subheader("⚡ Integrated Ranking Position")

        planet_scored = scored_data[scored_data["kepoi_name"] == selected_planet]
        if not planet_scored.empty:
            rank_pos = scored_data.sort_values("candidate_score", ascending=False).reset_index(drop=True)
            rank_pos.index += 1
            planet_rank = rank_pos[rank_pos["kepoi_name"] == selected_planet].index
            if len(planet_rank) > 0:
                st.metric("Candidate Score Rank", f"#{planet_rank[0]} of {len(rank_pos):,}")


# ============================================================
# PAGE 7 — PLANET COMPARISON
# ============================================================

elif page == "⚖️ Planet Comparison":

    st.markdown('<div class="section-title">⚖️ Planet Comparison</div>', unsafe_allow_html=True)

    st.write("Select 2–5 planets to compare their scientific characteristics side by side.")

    if "kepoi_name" not in df.columns:
        st.error("Planet identifier column not found.")
    else:
        all_planet_names = sorted(df["kepoi_name"].dropna().unique().tolist())

        # Default to first 3 planets that have data
        default_planets = all_planet_names[:3] if len(all_planet_names) >= 3 else all_planet_names

        selected_planets = st.multiselect(
            "Choose 2–5 planets to compare",
            options=all_planet_names,
            default=default_planets,
            max_selections=5
        )

        if len(selected_planets) < 2:
            st.info("Please select at least 2 planets.")
        else:
            # Build comparison table
            comparison_rows = []

            for pname in selected_planets:
                row_df = df[df["kepoi_name"] == pname]
                scored_row = scored_data[scored_data["kepoi_name"] == pname]
                hz_row = hz_df[hz_df["kepoi_name"] == pname] if "kepoi_name" in hz_df.columns else pd.DataFrame()

                if row_df.empty:
                    continue

                r = row_df.iloc[0]
                s = scored_row.iloc[0] if not scored_row.empty else pd.Series()
                h = hz_row.iloc[0] if not hz_row.empty else pd.Series()

                entry = {
                    "Planet": pname,
                    "Radius (R⊕)": r.get("koi_prad", np.nan),
                    "Teq (K)": r.get("koi_teq", np.nan),
                    "Insol (F⊕)": r.get("koi_insol", np.nan),
                    "Period (days)": r.get("koi_period", np.nan),
                    "SMA (AU)": r.get("koi_sma", np.nan),
                    "Stellar Teff (K)": r.get("koi_steff", np.nan),
                    "Stellar Rad (R☉)": r.get("koi_srad", np.nan),
                    "Stellar Mass (M☉)": r.get("koi_smass", np.nan),
                    "Candidate Score": s.get("candidate_score", np.nan),
                    "Priority": str(s.get("priority", "N/A")),
                    "HZ Classification": str(h.get("HZ_Classification", "N/A")),
                    "Disposition": str(r.get("koi_disposition", "N/A"))
                }

                # Add HITE if available
                if HITE_AVAILABLE:
                    hite_results_comp = compute_hite_results(df)
                    if not hite_results_comp.empty and "kepoi_name" in hite_results_comp.columns:
                        hite_row = hite_results_comp[hite_results_comp["kepoi_name"] == pname]
                        if not hite_row.empty:
                            entry["HITE H"] = hite_row.iloc[0].get("HITE_H", np.nan)
                            entry["HITE H′"] = hite_row.iloc[0].get("HITE_H_prime", np.nan)

                comparison_rows.append(entry)

            if comparison_rows:
                comp_df = pd.DataFrame(comparison_rows).set_index("Planet")

                st.markdown('<div class="section-title">📋 Side-by-Side Comparison</div>', unsafe_allow_html=True)
                st.dataframe(comp_df.T, use_container_width=True)

                # Bar chart: Candidate Score
                numeric_comp = comp_df.select_dtypes(include=[np.number]).reset_index()

                if "Candidate Score" in comp_df.columns:
                    st.markdown('<div class="section-title">📊 Candidate Score Comparison</div>', unsafe_allow_html=True)
                    fig_score_bar = px.bar(
                        comp_df.reset_index(),
                        x="Planet",
                        y="Candidate Score",
                        title="Candidate Score by Planet",
                        template="plotly_dark",
                        color="Planet",
                        text="Candidate Score"
                    )
                    fig_score_bar.update_traces(texttemplate="%{text:.1f}", textposition="outside")
                    fig_score_bar.update_layout(
                        plot_bgcolor="#111629",
                        paper_bgcolor="#111629",
                        font_color="#aab2c8",
                        showlegend=False
                    )
                    st.plotly_chart(fig_score_bar, use_container_width=True)

                # Bar chart: HITE H if available
                if "HITE H" in comp_df.columns:
                    st.markdown('<div class="section-title">🔬 HITE H Score Comparison</div>', unsafe_allow_html=True)
                    hite_bar_df = comp_df.reset_index().dropna(subset=["HITE H"])
                    if not hite_bar_df.empty:
                        fig_hite_bar = px.bar(
                            hite_bar_df,
                            x="Planet",
                            y="HITE H",
                            title="HITE H Score by Planet",
                            template="plotly_dark",
                            color="Planet",
                            text="HITE H"
                        )
                        fig_hite_bar.update_traces(texttemplate="%{text:.4f}", textposition="outside")
                        fig_hite_bar.update_layout(
                            plot_bgcolor="#111629",
                            paper_bgcolor="#111629",
                            font_color="#aab2c8",
                            showlegend=False
                        )
                        st.plotly_chart(fig_hite_bar, use_container_width=True)
                    else:
                        st.info("No HITE H values available for selected planets.")

                # Radar Chart
                st.markdown('<div class="section-title">🕸️ Radar Chart Comparison</div>', unsafe_allow_html=True)

                # Normalize selected metrics to [0, 1]
                radar_metrics = [
                    "Radius (R⊕)", "Teq (K)", "Insol (F⊕)", "Candidate Score"
                ]
                if "HITE H" in comp_df.columns:
                    radar_metrics.append("HITE H")

                radar_avail = [m for m in radar_metrics if m in comp_df.columns]
                radar_data = comp_df[radar_avail].copy().select_dtypes(include=[np.number])

                if len(radar_data.columns) >= 3 and not radar_data.empty:
                    # Min-max normalize
                    radar_norm = radar_data.copy()
                    for col in radar_norm.columns:
                        col_min = radar_norm[col].min()
                        col_max = radar_norm[col].max()
                        if col_max > col_min:
                            radar_norm[col] = (radar_norm[col] - col_min) / (col_max - col_min)
                        else:
                            radar_norm[col] = 0.5

                    radar_norm = radar_norm.fillna(0)

                    fig_radar = go.Figure()

                    categories = radar_norm.columns.tolist()
                    categories_closed = categories + [categories[0]]

                    colors = ["#6366f1", "#06d6a0", "#ffd166", "#ff6b6b", "#38bdf8"]

                    for i, (planet_name, row_vals) in enumerate(radar_norm.iterrows()):
                        vals = row_vals.tolist()
                        vals_closed = vals + [vals[0]]
                        fig_radar.add_trace(go.Scatterpolar(
                            r=vals_closed,
                            theta=categories_closed,
                            fill="toself",
                            name=planet_name,
                            line_color=colors[i % len(colors)],
                            opacity=0.7
                        ))

                    fig_radar.update_layout(
                        polar=dict(
                            radialaxis=dict(visible=True, range=[0, 1]),
                            bgcolor="#111629"
                        ),
                        showlegend=True,
                        template="plotly_dark",
                        title="Normalized Multi-Metric Radar Comparison",
                        paper_bgcolor="#111629",
                        font_color="#aab2c8"
                    )
                    st.plotly_chart(fig_radar, use_container_width=True)
                    st.caption("All metrics normalized to [0, 1] for radar visualization. Higher is not always better — check individual values above.")
                else:
                    st.info("Not enough numeric metrics available for radar chart.")


# ============================================================
# PAGE 8 — EXPLORE DATA
# ============================================================

elif page == "📊 Explore Data":

    st.markdown('<div class="section-title">📊 Explore Exoplanet Dataset</div>', unsafe_allow_html=True)

    st.write("Explore the scientific variables used by the analysis pipeline.")

    selected_feature = st.selectbox("Select a scientific feature", available_features)

    col1, col2 = st.columns(2)

    with col1:
        fig, ax = plt.subplots(figsize=(7, 4))
        sns.histplot(model_data[selected_feature], bins=30, kde=True, ax=ax)
        ax.set_title(f"Distribution of {selected_feature}")
        st.pyplot(fig)
        plt.close()

    with col2:
        st.metric("Mean", f"{model_data[selected_feature].mean():.3f}")
        st.metric("Median", f"{model_data[selected_feature].median():.3f}")
        st.metric("Missing Values After Cleaning", f"{model_data[selected_feature].isna().sum():,}")

    st.markdown('<div class="section-title">Dataset Preview</div>', unsafe_allow_html=True)

    st.dataframe(df.head(50), use_container_width=True, height=400)

    st.markdown('<div class="section-title">🔗 Feature Correlations</div>', unsafe_allow_html=True)

    correlation = model_data[available_features].corr()

    fig, ax = plt.subplots(figsize=(11, 7))
    sns.heatmap(correlation, annot=True, fmt=".2f", cmap="coolwarm", ax=ax)
    ax.set_title("Correlation Between Scientific Features")
    st.pyplot(fig)
    plt.close()


# ============================================================
# PAGE 9 — METHODOLOGY
# ============================================================

elif page == "📚 Methodology":

    st.markdown('<div class="section-title">📚 Project Methodology</div>', unsafe_allow_html=True)

    # Existing methodology cards
    st.markdown("""
    <div class="info-card">
    <div class="info-title">1. Data Collection</div>
    <div class="info-text">
    The system uses a Kepler exoplanet dataset containing thousands of observed
    records and planetary/stellar characteristics.
    </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">2. Data Preprocessing</div>
    <div class="info-text">
    Missing and infinite values are handled before analysis.
    Relevant scientific variables are selected for modelling.
    </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">3. Exploratory Data Analysis</div>
    <div class="info-text">
    Distributions and correlations are examined to understand
    relationships between planetary and stellar characteristics.
    </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">4. Candidate Screening</div>
    <div class="info-text">
    A transparent weighted score is calculated from planetary
    radius, equilibrium temperature and stellar insolation.
    </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">5. Machine Learning</div>
    <div class="info-text">
    Random Forest classification is used to identify patterns
    associated with the recorded exoplanet disposition.
    </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">6. Interpretation</div>
    <div class="info-text">
    The system ranks candidates for further scientific investigation.
    It does not claim that a planet contains life.
    </div>
    </div>
    """, unsafe_allow_html=True)

    # Implementation Status
    st.markdown('<div class="section-title">🔬 Current Implementation Status</div>', unsafe_allow_html=True)

    status = pd.DataFrame({
        "Component": [
            "Data Loading", "Preprocessing", "Exploratory Data Analysis",
            "Candidate Scoring", "Candidate Ranking", "Random Forest Classification",
            "Interactive Dashboard", "HITE Analysis", "Kopparapu HZ",
            "Three-Tier Ranking", "Planet Comparison", "SHAP Explainability",
            "Regression", "Cloud Deployment"
        ],
        "Status": [
            "Implemented", "Implemented", "Implemented",
            "Implemented", "Implemented", "Implemented",
            "Implemented v2", "Implemented v2", "Implemented v2",
            "Implemented v2", "Implemented v2", "Next Phase",
            "Next Phase", "Next Phase"
        ]
    })

    st.dataframe(status, use_container_width=True, hide_index=True)

    st.success(
        "v2 implementation adds HITE analysis, Kopparapu HZ, three ranking systems, "
        "and planet comparison. Advanced explainability, regression and deployment "
        "can be added in the next development phase."
    )

    # HITE Methodology
    st.markdown('<div class="section-title">🔬 HITE Methodology</div>', unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">Habitability Index for Transiting Exoplanets (HITE)</div>
    <div class="info-text">
    Introduced by Barnes, Meadows &amp; Evans (2015), HITE estimates the
    fraction of (Bond albedo A, orbital eccentricity e) parameter space for
    which a planet could maintain liquid surface water. It is calculated
    from transit observables without direct albedo measurements.
    </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("**Stellar Luminosity (from transit data):**")
    st.latex(r"L_\star = R_\star^2 \left(\frac{T_\star}{T_\odot}\right)^4 \quad [L_\odot]")

    st.markdown("**Planet radius from transit depth:**")
    st.latex(r"R_p = \sqrt{\delta} \cdot R_\star \quad \text{where } \delta = \frac{\Delta F}{F} \text{ (transit depth fraction)}")

    st.markdown("**Mass–radius relations (Fortney et al. 2007):**")
    st.latex(r"M_p = \begin{cases} 0.0592\,f_{ice}\,R_p^{0.0592} + 0.0975\,R_p^{2.1} & R_p < 1.5\,R_\oplus \\ 0.0592\,f_{ice}\,R_p^{0.0592} + 0.0975\,R_p^{2.1} & R_p \geq 1.5\,R_\oplus \end{cases}")

    st.markdown("**Rocky probability (smooth sigmoid on planetary radius):**")
    st.latex(r"P_{\text{rocky}}(R_p) = \frac{1}{1 + \exp\!\left(\frac{R_p - R_{\text{threshold}}}{\sigma}\right)}")

    st.markdown("**Minimum eccentricity from transit duration:**")
    st.latex(r"e_{\min} = \left|1 - \frac{2\,a\,t_{14}}{P\,R_\star}\sqrt{1 - b^2}\right|")

    st.markdown("**Time-averaged incident stellar flux:**")
    st.latex(r"F(A, e) = \frac{L_\star\,(1 - A)}{16\pi\,a^2\,\sqrt{1 - e^2}}")

    st.markdown("**HITE H — fraction of parameter space that is habitable:**")
    st.latex(r"H = \frac{1}{(A_{\max} - A_{\min})(e_{\max} - e_{\min})} \iint_{F_{\min} < F(A,e) < F_{\max}} dA\, de")

    # Kopparapu Methodology
    st.markdown('<div class="section-title">🌍 Kopparapu HZ Methodology</div>', unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">Kopparapu et al. (2014) Conservative Habitable Zone</div>
    <div class="info-text">
    The Kopparapu model calculates the inner and outer habitable-zone
    flux boundaries as fourth-degree polynomial functions of stellar
    effective temperature, calibrated to one Earth mass.
    </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("**Stellar flux boundary (Kopparapu 2014):**")
    st.latex(r"S_{\text{eff}} = S_0 + a\,T_\star' + b\,T_\star'^2 + c\,T_\star'^3 + d\,T_\star'^4")
    st.latex(r"T_\star' = T_{\text{eff}} - 5780 \quad \text{(K, relative to solar)}")

    st.markdown("**Conservative boundaries (1 Earth mass):**")
    st.latex(r"S_{\text{inner}} \text{ (Runaway Greenhouse)}: \quad S_0 = 1.107,\; a = 1.332\times10^{-4},\; \ldots")
    st.latex(r"S_{\text{outer}} \text{ (Maximum Greenhouse)}: \quad S_0 = 0.356,\; a = 6.171\times10^{-5},\; \ldots")

    st.markdown("**Classification:**")
    st.latex(r"\text{Conservative HZ} \iff S_{\text{outer}} \leq S_{\text{obs}} \leq S_{\text{inner}}")

    # Ranking Methodology
    st.markdown('<div class="section-title">🏆 Ranking Methodology</div>', unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">Three Ranking Systems</div>
    <div class="info-text">
    <b>1. HITE Ranking:</b> Planets are ranked by their HITE H score (fraction of
    albedo–eccentricity space consistent with liquid water). Higher H = more
    parameter combinations support habitability.<br><br>
    <b>2. Kopparapu Ranking:</b> Planets are classified by their position relative
    to conservative habitable-zone boundaries derived from stellar effective
    temperature. Conservative HZ planets are ranked highest.<br><br>
    <b>3. Integrated Ranking:</b> A project-specific prioritisation framework that
    combines the candidate screening score (radius, temperature, flux) with
    Kopparapu HZ classification into six priority groups (A–F).
    Group A = High screening score + Conservative HZ. This framework is
    <em>not</em> a published scientific model.
    </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    **Candidate Screening Score formula:**
    """)
    st.latex(r"\text{Score} = 100 \times \left(0.40 \cdot s_r + 0.30 \cdot s_T + 0.30 \cdot s_F\right)")
    st.latex(r"s_x = \begin{cases} 1 & x \in [\text{ideal\_low}, \text{ideal\_high}] \\ \frac{x - \text{low}}{\text{ideal\_low} - \text{low}} & x < \text{ideal\_low} \\ \frac{\text{high} - x}{\text{high} - \text{ideal\_high}} & x > \text{ideal\_high} \\ 0 & \text{otherwise} \end{cases}")

    # References
    st.markdown('<div class="section-title">📖 References</div>', unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
    <div class="info-title">Scientific References</div>
    <div class="info-text">
    <b>Barnes, R., Meadows, V. S., &amp; Evans, N. (2015).</b>
    Comparative Habitability of Transiting Exoplanets.
    <em>The Astrophysical Journal</em>, 814(2), 91.
    https://doi.org/10.1088/0004-637X/814/2/91<br><br>

    <b>Kopparapu, R. K., et al. (2014).</b>
    Habitable Zones Around Main-Sequence Stars: Dependence on Planetary Mass.
    <em>The Astrophysical Journal Letters</em>, 787(2), L29.
    https://doi.org/10.1088/2041-8205/787/2/L29<br><br>

    <b>Kopparapu, R. K., et al. (2013).</b>
    Habitable Zones Around Main-Sequence Stars: New Estimates.
    <em>The Astrophysical Journal</em>, 765(2), 131.
    https://doi.org/10.1088/0004-637X/765/2/131<br><br>

    <b>Fortney, J. J., Marley, M. S., &amp; Barnes, J. W. (2007).</b>
    Planetary Radii across Five Orders of Magnitude in Mass and Stellar Insolation:
    Application to Transits.
    <em>The Astrophysical Journal</em>, 659(2), 1661–1672.<br><br>

    <b>Thompson, S. E., et al. (2018).</b>
    Planetary Candidates Observed by Kepler. VIII.
    A Fully Automated Catalog Based on Data Release 25.
    <em>The Astrophysical Journal Supplement Series</em>, 235(2), 38.
    </div>
    </div>
    """, unsafe_allow_html=True)


# ============================================================
# FOOTER
# ============================================================

st.markdown("---")

st.markdown("""
<div style="text-align:center; color:#687188; padding:15px;">
    EXO-SCAN v2 • Exoplanet Candidate Intelligence Platform<br>
    <span style="font-size:12px;">
    Integrating HITE · Kopparapu HZ · Random Forest · Three-Tier Ranking
    </span>
</div>
""", unsafe_allow_html=True)
