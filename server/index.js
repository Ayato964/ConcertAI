const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const port = 8080;


const VITE_API_BASE_URL = process.env.VITE_API_BASE_URL;
const GENERATE_API_URL = `${VITE_API_BASE_URL}/generate`;
const MODEL_INFO_API_URL = `${VITE_API_BASE_URL}/model_info`;




app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.post('/generate', upload.fields([
  { name: 'midi' },
  { name: 'conditions_midi' },
  { name: 'past_midi' },
  { name: 'future_midi' },
  { name: 'meta_json' }
]), async (req, res) => {
  console.log('Received generation request, proxying to model API...');

  if (!req.files || !req.files.meta_json) {
    return res.status(400).json({ detail: 'Missing meta_json file' });
  }

  const cleanup = () => {

    const files = [
      req.files.midi?.[0],
      req.files.conditions_midi?.[0],
      req.files.past_midi?.[0],
      req.files.future_midi?.[0],
      req.files.meta_json?.[0]
    ].filter(Boolean);

    files.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Failed to delete temp file ${file.originalname}:`, err);
      });
    });
  };


  try {
    const formData = new FormData();

    // Add MIDI files if they exist
    if (req.files.midi) {
      formData.append('midi', fs.createReadStream(req.files.midi[0].path), req.files.midi[0].originalname);
    }
    if (req.files.conditions_midi) {
      formData.append('conditions_midi', fs.createReadStream(req.files.conditions_midi[0].path), req.files.conditions_midi[0].originalname);
    }
    if (req.files.past_midi) {
      formData.append('past_midi', fs.createReadStream(req.files.past_midi[0].path), req.files.past_midi[0].originalname);
    }
    if (req.files.future_midi) {
      formData.append('future_midi', fs.createReadStream(req.files.future_midi[0].path), req.files.future_midi[0].originalname);
    }

    // Add meta_json (required)
    const metaFile = req.files.meta_json[0];
    formData.append('meta_json', fs.createReadStream(metaFile.path), metaFile.originalname);


    const response = await fetch(GENERATE_API_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Proxying failed. External API returned an error:', errorBody);
      cleanup(); // Clean up even on failure
      return res.status(response.status).send(errorBody);
    }

    res.setHeader('Content-Type', response.headers.get('content-type'));
    res.setHeader('Content-Disposition', response.headers.get('content-disposition'));

    // Pipe the response and clean up files only after it has finished.
    response.body.pipe(res).on('finish', cleanup);

  } catch (error) {
    console.error('Error proxying request:', error);
    cleanup(); // Clean up on exception
    res.status(500).json({ detail: 'Failed to proxy request to the generation API.' });
  }
});

const modelInfo = {
  "0": {
    "model_name": "MORTM4.1Pro-SAX",
    "description": "マルチタスクに対応した万能モデル。サックスのみに対応",
    "tag": { "instrument": "sax", "model": "sft", "type": "mortm", "version": "4.1" },
    "model_folder_path": "C:\\Users\\Nagoshi Takaaki.KTHRLab\\PycharmProjects\\MORTM_API2..."
  },
  "1": {
    "model_name": "MORTM4.1-SAX",
    "description": "旋律生成タスクのみのPre-Trainedモデル。サックスのみに対応",
    "tag": { "instrument": "sax", "model": "pretrained", "type": "mortm", "version": "4.1" },
    "model_folder_path": "C:\\Users\\Nagoshi Takaaki.KTHRLab\\PycharmProjects\\MORTM_API2\\data\\models\\MORTM4_1_SAX"
  }
};

app.post('/model_info', async (req, res) => {
  console.log('Received model_info request, proxying to model API (POST)...');
  try {
    const response = await fetch(MODEL_INFO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.warn('Proxying model_info failed, falling back to static data.');
      return res.json(modelInfo);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying model_info request:', error);
    res.json(modelInfo); // Fallback
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

