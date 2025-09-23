const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
const port = 8080;

// The target URL for the actual model API.
// Found in client/vite.config.js
const GENERATE_API_URL = 'https://8d4f2be12ab2.ngrok-free.app/generate';

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.post('/generate', upload.fields([{ name: 'midi' }, { name: 'meta_json' }]), async (req, res) => {
  console.log('Received generation request, proxying to model API...');

  if (!req.files || !req.files.midi || !req.files.meta_json) {
    return res.status(400).json({ detail: 'Missing midi or meta_json file' });
  }

  const midiFile = req.files.midi[0];
  const metaFile = req.files.meta_json[0];

  const cleanup = () => {
    fs.unlink(midiFile.path, (err) => {
      if (err) console.error('Failed to delete temp midi file:', err);
    });
    fs.unlink(metaFile.path, (err) => {
      if (err) console.error('Failed to delete temp meta_json file:', err);
    });
  };

  try {
    const formData = new FormData();
    formData.append('midi', fs.createReadStream(midiFile.path), midiFile.originalname);
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

app.get('/model_info', (req, res) => {
  res.json(modelInfo);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
