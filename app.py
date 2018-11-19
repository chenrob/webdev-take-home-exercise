import os
import json
from flask import Flask, render_template, jsonify

app = Flask(__name__, template_folder='.', static_folder='assets')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dogs', methods=['GET'])
def get_dogs():
    with open('assets/data/dogs.json') as f:
        dogs = json.load(f)

    return jsonify(dogs)
