from flask import Flask, render_template, request  # Flask utilities
import numpy as np  # NumPy for numerical operations
import joblib  # To load the trained model
import pickle  # To load the scaler
import shap  # SHAP for explainability
import pandas as pd  # Pandas for handling data if needed
import os

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("home.html")

# Your existing routes and logic

@app.route("/result", methods=['POST', 'GET'])
def result():
    # Get form data from the user input
    gender = int(request.form['gender'])
    age = int(request.form['age'])
    hypertension = int(request.form['hypertension'])
    heart_disease = int(request.form['heart_disease'])
    ever_married = int(request.form['ever_married'])
    work_type = int(request.form['work_type'])
    Residence_type = int(request.form['Residence_type'])
    avg_glucose_level = float(request.form['avg_glucose_level'])
    bmi = float(request.form['bmi'])
    smoking_status = int(request.form['smoking_status'])

    # Prepare the input data
    x = np.array([gender, age, hypertension, heart_disease, ever_married, work_type, Residence_type,
                  avg_glucose_level, bmi, smoking_status]).reshape(1, -1)

    scaler_path = os.path.join('D:\jupyter\Stroke Prediction (1)\Stroke Prediction','models\scaler.pkl')
    with open(scaler_path, 'rb') as scaler_file:
        scaler = pickle.load(scaler_file)
    x_scaled = scaler.transform(x)

    # Load the trained/optimized model
    model_path = os.path.join('D:\jupyter\Stroke Prediction (1)\Stroke Prediction','models\dt.sav')
    with open(model_path, 'rb') as model_file:
        best_model = pickle.load(model_file)

    # Make the prediction
    Y_pred = best_model.predict(x_scaled)

    # SHAP explanation to get feature importance
    explainer = shap.TreeExplainer(best_model)
    shap_values = explainer.shap_values(x_scaled)

    # Extract the top 3 most important features contributing to the prediction
    # Make sure that X.columns is accessible (you may need to define X elsewhere in your code)
    important_features = ['age', 'hypertension', 'bmi']  # Replace with actual feature names if necessary

    # Pass the prediction and top features to the HTML page
    if Y_pred[0] == 0:
        return render_template('nostroke.html')
    else:
        return render_template('stroke.html', important_features=important_features)

if __name__ == "__main__":
    app.run(debug=True)
