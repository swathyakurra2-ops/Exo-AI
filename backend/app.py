# Imports Streamlit so the Python script can build an interactive web application.
import streamlit as st
# Imports Pandas for loading and working with tabular data.
import pandas as pd
# Imports NumPy for numerical operations and handling invalid numeric values.
import numpy as np
# Imports Matplotlib for creating charts.
import matplotlib.pyplot as plt
# Imports Seaborn for statistical charts such as histograms and heatmaps.
import seaborn as sns
# Imports the function that adds Kopparapu habitable-zone results to the dataset.
from kopparapu_hz import add_habitable_zone_columns

# Imports the function that splits data into training and testing sets.
from sklearn.model_selection import train_test_split
# Imports a tool that standardises feature values before model training.
from sklearn.preprocessing import StandardScaler
# Imports the Random Forest classification algorithm.
from sklearn.ensemble import RandomForestClassifier
# Imports functions used to evaluate classification predictions.
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
# Imports K-Means clustering, although it is not used elsewhere in this file.
from sklearn.cluster import KMeans


# ============================================================
# PAGE CONFIGURATION
# ============================================================

# Sets the browser title, icon, layout width, and initial sidebar state.
st.set_page_config(
    page_title="EXO-SCAN | Exoplanet Intelligence",
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
# LOAD DATA
# ============================================================

# Caches the loaded dataset so Streamlit does not reread the CSV on every rerun.
@st.cache_data
# Defines a function that loads the cleaned Kepler dataset from a CSV file.
def load_data():
    return pd.read_csv("cleankepler.csv")


# Loads the dataset into the main DataFrame named df.
df = load_data()


# Calculate Kopparapu habitable-zone results

# Creates a second DataFrame containing the original data plus habitable-zone calculations.
hz_df = add_habitable_zone_columns(df)
# ============================================================
# SIDEBAR
# ============================================================

# Places the navigation controls and dataset information inside the sidebar.
with st.sidebar:

    st.markdown("""
    <div style="text-align:center; padding:15px 0 25px 0;">
        <div style="font-size:42px;">🪐</div>
        <div style="font-size:24px; font-weight:800; color:white;">
            EXO-SCAN
        </div>
        <div style="font-size:12px; color:#8f98ad;">
            Exoplanet Intelligence Platform
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Adds a horizontal divider above the application footer.
    st.markdown("---")

    # Lets the user choose which application page to display.
    page = st.radio(
        "NAVIGATION",
        [
        "Dashboard",
        "Explore Data",
        "Habitable Zone",
        "Candidate Ranking",
        "ML Analysis",
        "Planet Explorer",
        "Methodology"
        ]
    )

    # Adds a horizontal divider above the application footer.
    st.markdown("---")

    st.markdown(
        f"""
        <div class="small-text">
        DATASET<br>
        <b>{len(df):,}</b> records<br><br>
        FEATURES<br>
        <b>{len(df.columns)}</b> original variables
        </div>
        """,
        unsafe_allow_html=True
    )

    
# ============================================================
# COMMON DATA PREPARATION
# ============================================================

# Lists the scientific columns that the analysis and machine-learning model may use.
scientific_features = [
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "koi_period",
    "koi_sma",
    "koi_steff",
    "koi_srad",
    "koi_smass"
]

# Keeps only the selected scientific features that actually exist in the CSV.
available_features = [x for x in scientific_features if x in df.columns]

# Makes a separate copy so model preparation does not directly modify the original dataset.
model_data = df.copy()

# Replaces positive and negative infinity values with missing values in the selected features.
model_data[available_features] = model_data[available_features].replace(
    [np.inf, -np.inf], np.nan
)

# Removes rows missing any selected model feature or the target disposition label.
model_data = model_data.dropna(
    subset=available_features + ["koi_disposition"]
)
# ============================================================
# HABITABLE ZONE PAGE
# ============================================================

# Displays the habitable-zone analysis page when that navigation option is selected.
if page == "Habitable Zone":

    st.markdown(
        '<div class="section-title">Kopparapu Habitable-Zone Analysis</div>',
        unsafe_allow_html=True
    )

    st.write(
        """
        This page applies the published Kopparapu et al. (2014)
        one-Earth-mass model to estimate conservative habitable-zone
        boundaries based on host-star effective temperature.

        These boundaries are a scientific screening tool. They do not
        establish whether a planet is habitable or supports life.
        """
    )

    # Classification counts
    st.subheader("Habitable-Zone Classifications")

    # Counts how many records belong to each habitable-zone classification.
    classification_counts = (
        hz_df["HZ_Classification"]
        .value_counts()
        .rename_axis("Classification")
        .reset_index(name="Number of Objects")
    )

    col1, col2 = st.columns([1, 1])

    with col1:
        st.dataframe(
            classification_counts,
            use_container_width=True,
            hide_index=True
        )

    with col2:
        st.bar_chart(
            classification_counts.set_index("Classification")
        )

    # Filters
    st.subheader("Explore Objects")

    # Builds a sorted list of available habitable-zone categories for the filter.
    classifications = sorted(
        hz_df["HZ_Classification"].dropna().unique()
    )

    # Lets the user filter the results by one habitable-zone category.
    selected_classification = st.selectbox(
        "Habitable-zone classification",
        classifications
    )

    # Builds the disposition filter options and includes an option to show every disposition.
    dispositions = ["All"] + sorted(
        hz_df["koi_disposition"].dropna().astype(str).unique()
    )

    # Lets the user filter the results by catalogue disposition.
    selected_disposition = st.selectbox(
        "Planet disposition",
        dispositions
    )

    # Filters the habitable-zone dataset to the selected classification.
    filtered_df = hz_df[
        hz_df["HZ_Classification"] == selected_classification
    ]

    if selected_disposition != "All":
        filtered_df = filtered_df[
            filtered_df["koi_disposition"].astype(str)
            == selected_disposition
        ]

    # Results table
    # Lists the columns intended for display in the filtered results table.
    display_columns = [
        "kepoi_name",
        "koi_steff",
        "koi_insol",
        "HZ_Inner_Flux",
        "HZ_Outer_Flux",
        "HZ_Classification",
        "koi_disposition"
    ]

    available_columns = [
        column for column in display_columns
        if column in filtered_df.columns
    ]

    st.write(
        f"**Objects matching your filters:** {len(filtered_df):,}"
    )

    st.dataframe(
        filtered_df[available_columns],
        use_container_width=True,
        hide_index=True
    )

    st.caption(
        "The model is applied only to host-star temperatures between "
        "2600 K and 7200 K. Objects outside this range are retained "
        "but are not classified using these boundaries."
    )

# ============================================================
# CANDIDATE SCORING
# ============================================================

# Converts a measurement into a score between zero and one based on its distance from an ideal range.
def range_score(value, low, ideal_low, ideal_high, high):

    if pd.isna(value):
        return 0

    if value < low or value > high:
        return 0

    if ideal_low <= value <= ideal_high:
        return 1

    if value < ideal_low:
        return (value - low) / (ideal_low - low)

    return (high - value) / (high - ideal_high)


# Calculates a weighted screening score and priority label for every record.
def calculate_candidate_score(data):

    # Creates a copy so the scoring function adds columns without changing its input DataFrame.
    result = data.copy()

    # Calculates a radius score for each planet using the configured radius ranges.
    result["radius_score"] = result["koi_prad"].apply(
        lambda x: range_score(x, 0.3, 0.8, 1.8, 2.5)
    )

    # Calculates a temperature score for each planet using the configured temperature ranges.
    result["temperature_score"] = result["koi_teq"].apply(
        lambda x: range_score(x, 180, 220, 320, 400)
    )

    # Calculates an insolation score for each planet using the configured flux ranges.
    result["flux_score"] = result["koi_insol"].apply(
        lambda x: range_score(x, 0.1, 0.25, 2.0, 4.0)
    )

    # Combines the three component scores using weights of 40%, 30%, and 30%.
    result["candidate_score"] = (
        0.40 * result["radius_score"]
        + 0.30 * result["temperature_score"]
        + 0.30 * result["flux_score"]
    ) * 100

    # Converts the numerical candidate score into Low, Medium, or High priority groups.
    result["priority"] = pd.cut(
        result["candidate_score"],
        bins=[-1, 40, 70, 101],
        labels=["Low", "Medium", "High"]
    )

    # Returns the scored dataset with the new score and priority columns.
    return result


# Calculates candidate scores once for use across the application pages.
scored_data = calculate_candidate_score(model_data)


# ============================================================
# DASHBOARD
# ============================================================

if page == "Dashboard":

    st.markdown(
        """
        <div class="hero">
            <div class="badge">AI-ASSISTED ASTRONOMICAL ANALYSIS</div>
            <h1 style="color: white; font-size: 36px; font-weight: 800;">
                Exoplanet Intelligence Platform
            </h1>
            <p style="color: #aab2c8; font-size: 16px; line-height: 1.7;">
                An interactive machine-learning system for exploring
                and prioritizing exoplanet candidates for further
                habitability research.
            </p>
        </div>
        """,
        unsafe_allow_html=True
    )

    # Keep the rest of your existing Dashboard code below this line.

    # KPI ROW

    # Counts all records in the loaded dataset.
    total_planets = len(df)

    # Counts records whose disposition is CONFIRMED.
    confirmed = (
        df["koi_disposition"]
        .astype(str)
        .str.upper()
        .eq("CONFIRMED")
        .sum()
    )

    # Counts records whose disposition is CANDIDATE.
    candidates = (
        df["koi_disposition"]
        .astype(str)
        .str.upper()
        .eq("CANDIDATE")
        .sum()
    )

    # Counts records assigned High priority by the screening score.
    high_priority = (
        scored_data["priority"]
        .astype(str)
        .eq("High")
        .sum()
    )

    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Exoplanet Records</div>
                <div class="metric-value">{total_planets:,}</div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with c2:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Confirmed</div>
                <div class="metric-value">{confirmed:,}</div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with c3:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Candidates</div>
                <div class="metric-value">{candidates:,}</div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with c4:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">High Priority</div>
                <div class="metric-value">{high_priority:,}</div>
            </div>
            """,
            unsafe_allow_html=True
        )

    st.markdown(
        '<div class="section-title">🔬 Scientific Overview</div>',
        unsafe_allow_html=True
    )

    col1, col2 = st.columns([1.4, 1])

    with col1:

        st.markdown("""
        <div class="info-card">

        <div class="info-title">
        What does EXO-SCAN do?
        </div>

        <div class="info-text">

        The system processes observed exoplanet and stellar
        characteristics such as planetary radius, equilibrium
        temperature, stellar flux and orbital properties.

        Machine-learning techniques are then used to identify
        patterns in the data, group similar planets and create
        a transparent candidate-prioritization score.

        </div>

        </div>
        """, unsafe_allow_html=True)

    with col2:

        st.markdown("""
        <div class="info-card">

        <div class="info-title">
        ⚠️ Scientific Scope
        </div>

        <div class="info-text">

        This system does <b>not</b> detect extraterrestrial life.

        The score represents a screening priority for
        further investigation based on selected observable
        characteristics.

        </div>

        </div>
        """, unsafe_allow_html=True)

    # Distribution

    st.markdown(
        '<div class="section-title">📊 Dataset Distribution</div>',
        unsafe_allow_html=True
    )

    col1, col2 = st.columns(2)

    with col1:

        # Counts the records in each catalogue disposition category.
        disposition_counts = df["koi_disposition"].value_counts()

        fig, ax = plt.subplots(figsize=(7, 4))

        disposition_counts.plot(
            kind="bar",
            ax=ax
        )

        ax.set_title("Exoplanet Disposition")
        ax.set_xlabel("")
        ax.set_ylabel("Number of Records")

        plt.xticks(rotation=0)

        st.pyplot(fig)
        plt.close()

    with col2:

        fig, ax = plt.subplots(figsize=(7, 4))

        sns.histplot(
            scored_data["candidate_score"],
            bins=25,
            kde=True,
            ax=ax
        )

        ax.set_title("Candidate Score Distribution")
        ax.set_xlabel("Candidate Score")
        ax.set_ylabel("Number of Planets")

        st.pyplot(fig)
        plt.close()


# ============================================================
# EXPLORE DATA
# ============================================================

# Displays the data-exploration page when that navigation option is selected.
elif page == "Explore Data":

    st.markdown(
        '<div class="section-title">Explore Exoplanet Dataset</div>',
        unsafe_allow_html=True
    )

    st.write(
        "Explore the scientific variables used by the analysis pipeline."
    )

    # Lets the user choose which scientific feature to inspect.
    selected_feature = st.selectbox(
        "Select a scientific feature",
        available_features
    )

    col1, col2 = st.columns(2)

    with col1:

        fig, ax = plt.subplots(figsize=(7, 4))

        sns.histplot(
            model_data[selected_feature],
            bins=30,
            kde=True,
            ax=ax
        )

        ax.set_title(f"Distribution of {selected_feature}")

        st.pyplot(fig)
        plt.close()

    with col2:

        st.metric(
            "Mean",
            f"{model_data[selected_feature].mean():.3f}"
        )

        st.metric(
            "Median",
            f"{model_data[selected_feature].median():.3f}"
        )

        st.metric(
            "Missing Values After Cleaning",
            f"{model_data[selected_feature].isna().sum():,}"
        )

    st.markdown(
        '<div class="section-title"> Dataset Preview</div>',
        unsafe_allow_html=True
    )

    st.dataframe(
        df.head(50),
        width="stretch",
        height=400
    )

    st.markdown(
        '<div class="section-title">🔗 Feature Correlations</div>',
        unsafe_allow_html=True
    )

    # Calculates pairwise correlations between the available scientific features.
    correlation = model_data[available_features].corr()

    fig, ax = plt.subplots(figsize=(11, 7))

    sns.heatmap(
        correlation,
        annot=True,
        fmt=".2f",
        cmap="coolwarm",
        ax=ax
    )

    ax.set_title("Correlation Between Scientific Features")

    st.pyplot(fig)
    plt.close()


# ============================================================
# CANDIDATE RANKING
# ============================================================

# Displays the candidate-ranking page when that navigation option is selected.
elif page == "Candidate Ranking":

    st.markdown(
        '<div class="section-title">Candidate Prioritization</div>',
        unsafe_allow_html=True
    )

    st.write(
        """
        Candidates are ranked using a transparent screening score
        based on planetary radius, equilibrium temperature and
        stellar insolation.
        """
    )

    # Selects records assigned High priority.
    high = scored_data[scored_data["priority"] == "High"]

    # Selects records assigned Medium priority.
    medium = scored_data[scored_data["priority"] == "Medium"]

    # Selects records assigned Low priority.
    low = scored_data[scored_data["priority"] == "Low"]

    c1, c2, c3 = st.columns(3)

    c1.metric("High Priority", len(high))
    c2.metric("Medium Priority", len(medium))
    c3.metric("Low Priority", len(low))

    st.markdown(
        '<div class="section-title">🏆 Top Candidates</div>',
        unsafe_allow_html=True
    )

    # Lets the user choose how many top-ranked candidates to display.
    top_n = st.slider(
        "Number of candidates to display",
        5,
        50,
        15
    )

    ranking_columns = [
        "kepoi_name",
        "koi_prad",
        "koi_teq",
        "koi_insol",
        "candidate_score",
        "priority"
    ]

    ranking_columns = [
        x for x in ranking_columns
        if x in scored_data.columns
    ]

    # Sorts records by candidate score from highest to lowest and selects the requested number.
    top_candidates = scored_data.sort_values(
        "candidate_score",
        ascending=False
    ).head(top_n)

    st.dataframe(
        top_candidates[ranking_columns],
        width="stretch",
        height=500
    )

    st.markdown("""
    <div class="info-card">

    <div class="info-title">
    🧠 How is the score calculated?
    </div>

    <div class="info-text">

    <b>40%</b> — Planetary radius<br>
    <b>30%</b> — Equilibrium temperature<br>
    <b>30%</b> — Stellar insolation

    <br><br>

    Higher scores indicate that the observed values fall closer
    to the predefined screening ranges.

    </div>

    </div>
    """, unsafe_allow_html=True)


# ============================================================
# MACHINE LEARNING
# ============================================================

# Displays the machine-learning page when that navigation option is selected.
elif page == "ML Analysis":

    st.markdown(
        '<div class="section-title">Random Forest Classification</div>',
        unsafe_allow_html=True
    )

    st.write(
        """
        A Random Forest classifier is used to learn patterns in
        the observed exoplanet dataset and predict the recorded
        disposition category.
        """
    )

    # Stores the selected scientific features as the model input data.
    X = model_data[available_features]

    # Stores the catalogue disposition as the class label the model must predict.
    y = model_data["koi_disposition"]

    # Remove very rare labels
    # Counts how many examples are available for each disposition class.
    counts = y.value_counts()

    # Keeps only classes that have at least ten records.
    valid_labels = counts[counts >= 10].index

    X = X[y.isin(valid_labels)]
    y = y[y.isin(valid_labels)]

    # Splits the data into training and testing portions while preserving class proportions.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    # Creates a scaler that learns feature means and standard deviations from training data.
    scaler = StandardScaler()

    # Learns scaling values from the training set and applies them to it.
    X_train_scaled = scaler.fit_transform(X_train)
    # Applies the training-set scaling values to the test set.
    X_test_scaled = scaler.transform(X_test)

    # Creates a Random Forest model containing 100 decision trees.
    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42
    )

    # Trains the Random Forest model using the scaled training data and labels.
    model.fit(
        X_train_scaled,
        y_train
    )

    # Uses the trained model to predict disposition labels for the test data.
    predictions = model.predict(X_test_scaled)

    # Calculates the proportion of test predictions that are correct.
    accuracy = accuracy_score(
        y_test,
        predictions
    )

    c1, c2, c3 = st.columns(3)

    c1.metric(
        "Model",
        "Random Forest"
    )

    c2.metric(
        "Test Accuracy",
        f"{accuracy * 100:.2f}%"
    )

    c3.metric(
        "Trees",
        "100"
    )

    st.markdown(
        '<div class="section-title">Confusion Matrix</div>',
        unsafe_allow_html=True
    )

    # Creates a consistent sorted list of class labels for the confusion matrix.
    labels = sorted(y.unique())

    # Counts correct and incorrect predictions for each disposition class.
    cm = confusion_matrix(
        y_test,
        predictions,
        labels=labels
    )

    fig, ax = plt.subplots(figsize=(7, 5))

    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        xticklabels=labels,
        yticklabels=labels,
        cmap="Blues",
        ax=ax
    )

    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")

    st.pyplot(fig)
    plt.close()

    st.markdown(
        '<div class="section-title">Feature Importance</div>',
        unsafe_allow_html=True
    )

    # Builds a table containing each feature and its Random Forest importance value.
    importance = pd.DataFrame({
        "Feature": available_features,
        "Importance": model.feature_importances_
    }).sort_values(
        "Importance",
        ascending=False
    )

    fig, ax = plt.subplots(figsize=(9, 5))

    ax.barh(
        importance["Feature"],
        importance["Importance"]
    )

    ax.invert_yaxis()

    ax.set_xlabel("Importance")
    ax.set_title("Random Forest Feature Importance")

    st.pyplot(fig)
    plt.close()

    st.markdown(
        '<div class="section-title">Classification Report</div>',
        unsafe_allow_html=True
    )

    # Calculates precision, recall, F1-score, and support for each class.
    report = classification_report(
        y_test,
        predictions,
        output_dict=True
    )

    # Converts the classification report dictionary into a table for display.
    report_df = pd.DataFrame(report).transpose()

    st.dataframe(
        report_df.round(3),
        width="stretch"
    )


# ============================================================
# PLANET EXPLORER
# ============================================================

# ============================================================
# PLANET EXPLORER
# ============================================================

# Displays the individual-planet page when that navigation option is selected.
elif page == "Planet Explorer":

    st.markdown(
        '<div class="section-title">Individual Planet Explorer</div>',
        unsafe_allow_html=True
    )

    if "kepoi_name" in scored_data.columns:

        # Creates a sorted list of available planet identifiers.
        planets = sorted(
            scored_data["kepoi_name"].dropna().unique()
        )

        # Lets the user select one planet from the available identifiers.
        selected_planet = st.selectbox(
            "Select an exoplanet",
            planets
        )

        # Retrieves the selected planet's scored record from the dataset.
        planet = scored_data[
            scored_data["kepoi_name"] == selected_planet
        ].iloc[0]

        # Planet profile — use native Streamlit components
        # Adds a horizontal divider above the application footer.
        st.markdown("---")
        st.caption("🪐 PLANET PROFILE")
        st.title(str(selected_planet))

        profile_col1, profile_col2 = st.columns(2)

        with profile_col1:
            st.metric(
                "Candidate Score",
                f"{planet['candidate_score']:.1f}/100"
            )

        with profile_col2:
            st.metric(
                "Priority",
                str(planet["priority"])
            )

        # Adds a horizontal divider above the application footer.
        st.markdown("---")

        # Planet property cards
        st.subheader("🌍 Planetary Characteristics")

        # Defines the planetary properties that will be shown as summary metrics.
        properties = [
            ("Planet Radius", "koi_prad"),
            ("Equilibrium Temperature", "koi_teq"),
            ("Stellar Insolation", "koi_insol"),
            ("Orbital Period", "koi_period")
        ]

        cols = st.columns(4)

        # Displays each selected planetary property in its own metric column.
        for col, (label, feature) in zip(cols, properties):

            with col:

                value = planet.get(feature, np.nan)

                if pd.isna(value):
                    display_value = "N/A"
                else:
                    display_value = f"{value:,.3f}"

                st.metric(
                    label=label,
                    value=display_value
                )

        # Complete planet information
        st.subheader("📋 Complete Planet Information")

        # Converts the selected planet's scientific feature values into a display table.
        details = planet[available_features].to_frame(
            name="Value"
        )

        details.index.name = "Feature"

        st.dataframe(
            details,
            width="stretch"
        )

    else:
        st.error(
            "The dataset does not contain the 'kepoi_name' column. "
            "Please verify the planet identifier column in cleankepler.csv."
        )

# ============================================================
# METHODOLOGY
# ============================================================

# Displays the methodology page when that navigation option is selected.
elif page == "Methodology":

    st.markdown(
        '<div class="section-title">Project Methodology</div>',
        unsafe_allow_html=True
    )

    st.markdown("""
    <div class="info-card">

    <div class="info-title">
    1. Data Collection
    </div>

    <div class="info-text">

    The system uses a Kepler exoplanet dataset containing
    thousands of observed records and planetary/stellar
    characteristics.

    </div>

    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">

    <div class="info-title">
    2. Data Preprocessing
    </div>

    <div class="info-text">

    Missing and infinite values are handled before analysis.
    Relevant scientific variables are selected for modelling.

    </div>

    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">

    <div class="info-title">
    3. Exploratory Data Analysis
    </div>

    <div class="info-text">

    Distributions and correlations are examined to understand
    relationships between planetary and stellar characteristics.

    </div>

    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">

    <div class="info-title">
    4. Candidate Screening
    </div>

    <div class="info-text">

    A transparent weighted score is calculated from planetary
    radius, equilibrium temperature and stellar insolation.

    </div>

    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">

    <div class="info-title">
    5. Machine Learning
    </div>

    <div class="info-text">

    Random Forest classification is used to identify patterns
    associated with the recorded exoplanet disposition.



    </div>

    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">

    <div class="info-title">
    6. Interpretation
    </div>

    <div class="info-text">

    The system ranks candidates for further scientific
    investigation. It does not claim that a planet contains life.

    </div>

    </div>
    """, unsafe_allow_html=True)

    st.markdown(
        '<div class="section-title">🔬 Current Implementation Status</div>',
        unsafe_allow_html=True
    )

    # Creates a table describing the implementation status of project components.
    status = pd.DataFrame({
    "Component": [
        "Data Loading",
        "Preprocessing",
        "Exploratory Data Analysis",
        "Candidate Scoring",
        "Candidate Ranking",
        "Random Forest Classification",
        "Interactive Dashboard",
        "SHAP Explainability",
        "Regression",
        "Cloud Deployment"
    ],
    "Status": [
        "Implemented",
        "Implemented",
        "Implemented",
        "Implemented",
        "Implemented",
        "Implemented",
        "Implemented",
        "Next Phase",
        "Next Phase",
        "Next Phase"
    ]
})

    st.dataframe(
        status,
        width="stretch",
        hide_index=True
    )

    # Displays a success message describing the prototype status and planned future work.
    st.success(
        "Prototype implementation is functional. "
        "Advanced explainability, regression and deployment "
        "can be added in the next development phase."
    )


# ============================================================
# FOOTER
# ============================================================

# Adds a horizontal divider above the application footer.
st.markdown("---")

st.markdown(
    """
    <div style="text-align:center; color:#687188; padding:15px;">
        EXO-SCAN • Exoplanet Candidate Intelligence Platform
        <br>
        <span style="font-size:12px;">
        AI-assisted screening for further scientific investigation
        </span>
    </div>
    """,
    unsafe_allow_html=True
)
