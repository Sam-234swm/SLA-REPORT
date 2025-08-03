from flask import Flask, render_template, request
import pandas as pd
import os
from utils.sla_logic import process_sla_data
from werkzeug.utils import secure_filename

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        file = request.files['file']
        selected_date = request.form['filter_date']
        if file and selected_date:
            filename = secure_filename(file.filename)
            path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(path)

            df, summary = process_sla_data(path, selected_date)

            return render_template('report.html', tables=[summary.to_html(classes='styled-table', index=True)], date=selected_date)

    return render_template('upload.html')

if __name__ == '__main__':
    app.run(debug=True)
