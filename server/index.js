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
      headers: {
        ...formData.getHeaders(),
        'ngrok-skip-browser-warning': '1'
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Proxying failed. External API returned an error:', errorBody);
      cleanup(); // Clean up even on failure
      return res.status(response.status).send(errorBody);
    }

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);

    const reasonHeader = response.headers.get('x-generation-reason');
    if (reasonHeader) {
      res.setHeader('X-Generation-Reason', reasonHeader);
    }
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Generation-Reason');

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
    "model_name": "MORTM4.5-Flash-Preview",
    "description": "ピアノやサックスを含む多様な楽器の演奏に対応したMORTM4.5モデルの軽量版です。高速な生成を実現しています。",
    "tag": {
      "instruments": ["PIANO", "SAX"],
      "task": ["Meta2MIDI"],
      "model": "pretrained",
      "type": "mortm",
      "version": "4.5"
    },
    "rule": {
      "input_midi": false,
      "multi_instrument": true,
      "temperature": true,
      "top_p": true,
      "number_of_generation": true,
      "send_context_past": false,
      "send_context_condition": false,
      "send_context_future": false,
      "send_chord_progression": false,
      "gen_measure_count": false,
      "gen_note_dense": true,
      "send_chord": false
    },
    "model_folder_path": "/home/takaaki-nagoshi/PycharmProjects/MORTM_API2/data/models/MORTM45_Flash"
  },
  "1": {
    "model_name": "MORTM4.5D-80M-SFT-Gen",
    "description": "MORTM4.5D 基盤モデルを生成タスク向けにSFTした80Mモデル。メタ情報(楽器/音符密度/キー/ジャンル/生成小節数)と、過去/未来/条件コンテキストMIDIから旋律を生成します。対応タスク: メタのみ生成(meta)、過去からの続き(meta_past)、未来への生成(meta_future)、過去+未来からの中間補完(infill)、他楽器の旋律から指定楽器の旋律を生成する編曲(inst_comp)。可変入出力長(1〜8小節)・42ジャンル・CoT(思考)に対応。",
    "tag": {
      "instruments": ["PIANO", "SAX"],
      "model": "sft_gen",
      "task": ["meta", "meta_past", "meta_future", "infill", "inst_comp"],
      "type": "mortm",
      "version": "4.5",
      "genres": [
        "80s", "90s", "alternative", "ambient", "blues", "celtic", "chillout",
        "classical", "country", "dance", "drumnbass", "easylistening", "electronic",
        "electropop", "experimental", "folk", "funk", "hiphop", "house", "indie",
        "instrumentalpop", "instrumentalrock", "jazz", "jazzfusion", "latin", "lounge",
        "metal", "newage", "orchestral", "pop", "popfolk", "poprock", "punkrock",
        "reggae", "rock", "soundtrack", "swing", "symphonic", "synthpop", "techno",
        "trance", "world"
      ]
    },
    "rule": {
      "input_midi": true,
      "multi_instrument": true,
      "temperature": true,
      "top_p": true,
      "number_of_generation": true,
      "send_context_past": true,
      "send_context_condition": true,
      "send_context_future": true,
      "send_chord_progression": false,
      "gen_measure_count": true,
      "gen_note_dense": true,
      "send_chord": false,
      "send_genre": true
    },
    "model_folder_path": "/home/takaaki-nagoshi/PycharmProjects/MORTM_API2/data/models/MORTM45D_80M_sft_gen"
  },
  "2": {
    "model_name": "MORTM4.5D-80M",
    "description": "MORTM4.5D 基盤(Foundation)モデル(80M)。ブロック穴埋め(Past/Const/Future)による事前学習で得た音楽 of 汎用表現を持ち、条件入力なし(<EOS>のみ)から自律的にピアノ/サックスのフレーズを生成します。フロントからの入力は不要で、温度・top-p・生成数のみ調整できます。",
    "tag": {
      "instruments": ["PIANO", "SAX"],
      "model": "foundation",
      "task": ["Generate"],
      "type": "mortm",
      "version": "4.5"
    },
    "rule": {
      "input_midi": false,
      "multi_instrument": true,
      "temperature": true,
      "top_p": true,
      "number_of_generation": true,
      "send_context_past": false,
      "send_context_condition": false,
      "send_context_future": false,
      "send_chord_progression": false,
      "gen_measure_count": false,
      "gen_note_dense": false,
      "send_chord": false,
      "send_genre": false
    },
    "model_folder_path": "/home/takaaki-nagoshi/PycharmProjects/MORTM_API2/data/models/MORTM45D_80M"
  }
};

app.post('/model_info', async (req, res) => {
  console.log('Received model_info request, proxying to model API (POST)...');
  try {
    const response = await fetch(MODEL_INFO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      }
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

