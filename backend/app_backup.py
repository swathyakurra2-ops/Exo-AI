import streamlit as st
import pandas as pd
import numpy as np

import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix



# ============================================================
# 1. PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Exoplanet Candidate Analyzer",
    page_icon="🌍",
    layout="wide"
)


# ============================================================
# 2. LOAD DATA
# ============================================================

@st.cache_data
def load_data():
    df = pd.read_csv("cleankepler.csv")
    return df


df = load_data()


# ============================================================
# 3. TITLE
# ============================================================

st.title("🌌 Exoplanet Candidate Analysis System")

st.write(
    """
    An AI/ML-based prototype for analyzing exoplanet properties,
    identifying similar planetary groups, and prioritizing candidates
    for further habitability research.
    """
)

st.info(
    "Important: The system does not claim that a planet contains life. "
    "It provides a screening and prioritization score based on selected "
    "observable planetary and stellar characteristics."
)


# ============================================================
# 4. DATA OVERVIEW
# ============================================================

st.header("1. Dataset Overview")

col1, col2, col3, col4 = st.columns(4)

col1.metric("Total Records", len(df))
col2.metric("Total Features", len(df.columns))
col3.metric("Confirmed", int((df["koi_disposition"] == "CONFIRMED").sum()))
col4.metric("Candidates", int((df["koi_disposition"] == "CANDIDATE").sum()))

st.write("### Dataset Preview")

st.dataframe(df.head(10), use_container_width=True)


# ============================================================
# 5. SELECT IMPORTANT FEATURES
# ============================================================

features = [
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "koi_period",
    "koi_sma",
    "koi_steff",
    "koi_srad",
    "koi_smass"
]

available_features = [f for f in features if f in df.columns]

working_df = df[available_features + ["kepoi_name", "koi_disposition"]].copy()


# ============================================================
# 6. DATA PREPROCESSING
# ============================================================

st.header("2. Data Preprocessing")

st.write("Selected scientific features:")

st.write(available_features)

before = len(working_df)

working_df = working_df.replace([np.inf, -np.inf], np.nan)

working_df = working_df.dropna(
    subset=available_features + ["koi_disposition"]
)

after = len(working_df)

st.write(f"Records before cleaning: **{before}**")
st.write(f"Records after cleaning: **{after}**")
st.write(f"Records removed: **{before - after}**")


# ============================================================
# 7. EXPLORATORY DATA ANALYSIS
# ============================================================

st.header("3. Exploratory Data Analysis")

eda_feature = st.selectbox(
    "Select a feature to visualize",
    available_features
)

fig, ax = plt.subplots(figsize=(8, 4))

sns.histplot(
    working_df[eda_feature],
    bins=40,
    kde=True,
    ax=ax
)

ax.set_title(f"Distribution of {eda_feature}")
ax.set_xlabel(eda_feature)
ax.set_ylabel("Number of Planets")

st.pyplot(fig)


st.write("### Feature Correlation")

corr = working_df[available_features].corr()

fig2, ax2 = plt.subplots(figsize=(10, 7))

sns.heatmap(
    corr,
    annot=True,
    fmt=".2f",
    ax=ax2
)

ax2.set_title("Correlation Between Exoplanet Features")

st.pyplot(fig2)


# ============================================================
# 8. CANDIDATE SCREENING SCORE
# ============================================================

st.header("4. Candidate Priority Score")

st.write(
    """
    The screening score is a transparent rule-based prioritization
    mechanism. It rewards planets whose radius, equilibrium temperature,
    and stellar flux fall within broad ranges of interest for further
    investigation.
    """
)


def range_score(value, low, ideal_low, ideal_high, high):

    if pd.isna(value):
        return 0

    if ideal_low <= value <= ideal_high:
        return 1.0

    if value < low or value > high:
        return 0.0

    if value < ideal_low:
        return (value - low) / (ideal_low - low)

    return (high - value) / (high - ideal_high)


def calculate_score(row):

    radius_score = range_score(
        row["koi_prad"],
        0.3,
        0.8,
        1.8,
        2.5
    )

    temperature_score = range_score(
        row["koi_teq"],
        180,
        220,
        320,
        400
    )

    flux_score = range_score(
        row["koi_insol"],
        0.1,
        0.25,
        2.0,
        4.0
    )

    score = (
        0.40 * radius_score +
        0.30 * temperature_score +
        0.30 * flux_score
    )

    return round(score * 100, 2)


working_df["candidate_score"] = working_df.apply(
    calculate_score,
    axis=1
)


def priority_label(score):

    if score >= 70:
        return "High Priority"
    elif score >= 40:
        return "Medium Priority"
    else:
        return "Low Priority"


working_df["priority"] = working_df["candidate_score"].apply(
    priority_label
)


col1, col2, col3 = st.columns(3)

col1.metric(
    "High Priority",
    int((working_df["priority"] == "High Priority").sum())
)

col2.metric(
    "Medium Priority",
    int((working_df["priority"] == "Medium Priority").sum())
)

col3.metric(
    "Low Priority",
    int((working_df["priority"] == "Low Priority").sum())
)


# ============================================================
# 9. TOP CANDIDATES
# ============================================================

st.subheader("Top Candidate Planets")

top_candidates = working_df.sort_values(
    "candidate_score",
    ascending=False
).head(20)

display_columns = [
    "kepoi_name",
    "koi_prad",
    "koi_teq",
    "koi_insol",
    "candidate_score",
    "priority"
]

st.dataframe(
    top_candidates[display_columns],
    use_container_width=True
)


# ============================================================
# 10. RANDOM FOREST CLASSIFICATION
# ============================================================

st.header("5. Machine Learning Classification")

st.write(
    """
    A Random Forest classifier is used as a supervised learning
    component to learn patterns associated with the existing
    Kepler disposition labels.
    """
)

ml_df = working_df.copy()

X = ml_df[available_features]
y = ml_df["koi_disposition"]

# Keep only classes with useful observations
valid_classes = y.value_counts()
valid_classes = valid_classes[valid_classes >= 10].index

mask = y.isin(valid_classes)

X = X[mask]
y = y[mask]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

model.fit(X_train_scaled, y_train)

y_pred = model.predict(X_test_scaled)

accuracy = accuracy_score(y_test, y_pred)

st.metric(
    "Random Forest Accuracy",
    f"{accuracy * 100:.2f}%"
)

st.write("### Classification Report")

report = classification_report(
    y_test,
    y_pred,
    output_dict=True
)

report_df = pd.DataFrame(report).transpose()

st.dataframe(
    report_df.round(3),
    use_container_width=True
)


# ============================================================
# 11. FEATURE IMPORTANCE
# ============================================================

st.subheader("Feature Importance")

importance = pd.DataFrame({
    "Feature": available_features,
    "Importance": model.feature_importances_
})

importance = importance.sort_values(
    "Importance",
    ascending=False
)

fig3, ax3 = plt.subplots(figsize=(8, 5))

sns.barplot(
    data=importance,
    x="Importance",
    y="Feature",
    ax=ax3
)

ax3.set_title("Random Forest Feature Importance")

st.pyplot(fig3)


# ============================================================
# 13. INDIVIDUAL PLANET ANALYSIS
# ============================================================

st.header("7. Individual Planet Analysis")

planet_names = working_df["kepoi_name"].dropna().unique()

selected_planet = st.selectbox(
    "Select an exoplanet",
    planet_names
)

planet = working_df[
    working_df["kepoi_name"] == selected_planet
].iloc[0]

col1, col2, col3 = st.columns(3)

col1.metric(
    "Candidate Score",
    f"{planet['candidate_score']:.2f}"
)

col2.metric(
    "Priority",
    planet["priority"]
)

col3.metric(
    "Kepler Disposition",
    planet["koi_disposition"]
)

st.write("### Planet Properties")

planet_properties = pd.DataFrame({
    "Property": [
        "Planet Radius",
        "Equilibrium Temperature",
        "Stellar Flux",
        "Orbital Period",
        "Semi-major Axis",
        "Stellar Temperature",
        "Stellar Radius",
        "Stellar Mass"
    ],
    "Value": [
        planet.get("koi_prad"),
        planet.get("koi_teq"),
        planet.get("koi_insol"),
        planet.get("koi_period"),
        planet.get("koi_sma"),
        planet.get("koi_steff"),
        planet.get("koi_srad"),
        planet.get("koi_smass")
    ]
})

st.table(planet_properties)


# ============================================================
# 14. PROJECT STATUS
# ============================================================

st.header("8. Current Implementation Status")

status = {
    "Data collection and loading": "Implemented",
    "Data preprocessing": "Implemented",
    "Exploratory data analysis": "Implemented",
    "Candidate scoring": "Implemented",
    "Candidate ranking": "Implemented",
    "Random Forest classification": "Implemented",
    "Interactive dashboard": "Implemented",
    "SHAP explainability": "Next phase",
    "Regression module": "Next phase",
    "Cloud deployment": "Next phase"
}

status_df = pd.DataFrame(
    list(status.items()),
    columns=["Component", "Status"]
)

st.table(status_df)

st.success(
    "Prototype successfully integrates data analysis, machine learning "
)