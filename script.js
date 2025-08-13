/*
  script.js

  This file implements the interactive behaviour of the MORTM melody
  generator.  It manages the conversation UI, MIDI file parsing, the
  interactive piano roll editor, real‑time playback using Tone.js and
  exporting edited melodies to downloadable MIDI files via the jsmidgen
  library.  No server is required – everything runs in the browser.
*/

// Configuration constants
const BAR_COUNT_MAX = 12;        // maximum number of bars shown
const PITCH_COUNT = 128;          // number of rows (full MIDI range 0-127)
const CELL_HEIGHT = 20;          // height of each pitch row
const HEADER_HEIGHT = 30;        // height of the header row

// Width in pixels of the pitch label column
const LABEL_WIDTH = 60;

// Width in pixels of a single bar on the piano roll
const BAR_PIXEL_WIDTH = 200;

// Available note divisions for one bar
const RES_OPTIONS = {
  '1/4': 4,
  '1/8': 8,
  '1/16': 16,
  '1/32': 32,
  '1/64': 64,
  '1/4t': 6,
  '1/8t': 12,
  '1/16t': 24,
  '1/32t': 48,
  '1/64t': 96,
};

// Current resolution selection (default to 1/16)
let currentResolutionKey = '1/16';
let stepsPerBar = RES_OPTIONS[currentResolutionKey];
let totalSteps = BAR_COUNT_MAX * stepsPerBar;

// Generate note names for the full MIDI range
const NOTE_NAMES = (() => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const list = [];
  for (let i = 0; i < 128; i++) {
    const octave = Math.floor(i / 12) - 1;
    const note = names[i % 12] + octave;
    list.push(note);
  }
  return list;
})();

// Global state
let grid = createEmptyGrid();
let selectedBars = 0;
let midiLoaded = false;
let synth = null;
let pianoSampler = null;
let saxSynth = null;
let playing = false;
let playheadStep = null;
let playheadInterval = null;
let candidates = [];
let currentCandidateIndex = -1;

// Web MIDI API 関連
let midiAccess = null;
let midiOutput = null;
let useWebMIDI = false;

// DOM references
const logContainer = document.getElementById('log-container');
const modelTabs = document.querySelectorAll('.model-tab');
const inputSelect = document.getElementById('input-select');
const fileInput = document.getElementById('file-input');
const resolutionSelect = document.getElementById('resolution-select');
const instrumentSelect = document.getElementById('instrument-select');
const advancedToggle = document.getElementById('advanced-toggle');
const advancedPanel = document.getElementById('advanced-panel');
const temperatureInput = document.getElementById('temperature');
const numOutputsInput = document.getElementById('num-outputs');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const generateBtn = document.getElementById('generate-btn');
const candidatesContainer = document.getElementById('candidates-container');
const pianorollContainer = document.getElementById('pianoroll-container');
const canvas = document.getElementById('pianoroll');
const downloadContainer = document.getElementById('download-container');
const headerOverlay = document.getElementById('header-overlay');
const statusText = document.querySelector('.status-text');

// Model selection state
let selectedModel = 'mortm4omni';

// Create an empty piano roll grid
function createEmptyGrid() {
  return Array.from({ length: PITCH_COUNT }, () => Array(totalSteps).fill(false));
}

// Append a new log entry to the log container
function addLog(text) {
  const p = document.createElement('div');
  p.textContent = text;
  logContainer.appendChild(p);
  // Keep only the last 5 log lines
  while (logContainer.childElementCount > 5) {
    logContainer.removeChild(logContainer.firstChild);
  }
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Enable controls once a pattern has been loaded
function enableControls() {
  playBtn.disabled = false;
  stopBtn.disabled = false;
  generateBtn.disabled = selectedBars === 0;
}

// Disable controls (when no MIDI loaded)
function disableControls() {
  playBtn.disabled = true;
  stopBtn.disabled = true;
  generateBtn.disabled = true;
}

// Sample patterns for demonstration
const samplePatterns = {
  sample1: () => {
    grid = createEmptyGrid();
    // ascending scale, one note per bar at first step
    for (let bar = 0; bar < BAR_COUNT_MAX; bar++) {
      const noteNumber = 60 + (bar % 12); // cycle through one octave
      const col = bar * stepsPerBar;
      grid[noteNumber][col] = true;
    }
    selectedBars = 0;
    midiLoaded = true;
    pianorollContainer.style.display = 'block';
    candidatesContainer.style.display = 'none';
    addLog('サンプル1を読み込みました。ピアノロールを編集できます。');
    enableControls();
  },
  sample2: () => {
    grid = createEmptyGrid();
    // simple chord progression: C major chord for every bar
    const chordRows = [60, 64, 67];
    for (let bar = 0; bar < BAR_COUNT_MAX; bar++) {
      chordRows.forEach((r) => {
        const baseCol = bar * stepsPerBar;
        if (baseCol < totalSteps) grid[r][baseCol] = true;
        if (baseCol + 1 < totalSteps) grid[r][baseCol + 1] = true;
      });
    }
    selectedBars = 0;
    midiLoaded = true;
    pianorollContainer.style.display = 'block';
    candidatesContainer.style.display = 'none';
    addLog('サンプル2を読み込みました。ピアノロールを編集できます。');
    enableControls();
  },
  sample3: () => {
    grid = createEmptyGrid();
    selectedBars = 0;
    midiLoaded = true;
    pianorollContainer.style.display = 'block';
    candidatesContainer.style.display = 'none';
    addLog('サンプル3を読み込みました。ピアノロールを編集できます。');
    enableControls();
  },
};

// Model selection changes
modelTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modelTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    selectedModel = tab.dataset.model;
    statusText.textContent = `モデル「${tab.textContent}」を選択しました。`;
    addLog(`モデル「${tab.textContent}」を選択しました。`);
  });
});

// Toggle advanced settings panel visibility
advancedToggle.addEventListener('click', () => {
  if (advancedPanel.style.display === 'none') {
    advancedPanel.style.display = 'flex';
  } else {
    advancedPanel.style.display = 'none';
  }
});

// Input selection changes
inputSelect.addEventListener('change', () => {
  const value = inputSelect.value;
  if (value === 'upload') {
    fileInput.style.display = 'inline';
    fileInput.value = '';
    addLog('ファイルをアップロードしてください。');
  } else {
    fileInput.style.display = 'none';
    if (value && samplePatterns[value]) {
      samplePatterns[value]();
    }
  }
});

// Resolution selection change handler
resolutionSelect.addEventListener('change', () => {
  const key = resolutionSelect.value;
  const oldGrid = grid;
  const oldStepsPerBar = stepsPerBar;
  currentResolutionKey = key;
  stepsPerBar = RES_OPTIONS[key];
  totalSteps = BAR_COUNT_MAX * stepsPerBar;

  grid = createEmptyGrid();
  for (let r = 0; r < PITCH_COUNT; r++) {
    if (r >= oldGrid.length) continue;
    for (let c = 0; c < oldGrid[r].length; c++) {
      if (oldGrid[r][c]) {
        const barIndex = Math.floor(c / oldStepsPerBar);
        const stepInBar = c % oldStepsPerBar;
        const newBarStart = barIndex * stepsPerBar;
        const newStepIndex = Math.floor(stepInBar * stepsPerBar / oldStepsPerBar);
        const newStart = newBarStart + newStepIndex;
        const durationCells = Math.max(1, Math.round(stepsPerBar / oldStepsPerBar));
        for (let i = 0; i < durationCells; i++) {
          const idx = newStart + i;
          if (idx >= 0 && idx < totalSteps) {
            grid[r][idx] = true;
          }
        }
      }
    }
  }
  selectedBars = 0;
  playheadStep = null;
  candidatesContainer.style.display = 'none';
  currentCandidateIndex = -1;
  candidates = [];
  addLog(`分割を${key}に変更しました。新しい解像度でピアノロールを編集できます。`);
  generateBtn.disabled = true;
  if (!midiLoaded) {
    disableControls();
  }
});

// File input change handler
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    addLog('MIDIファイルの読み込み機能は現在実装中です。');
  }
});

// Instrument selection change handler
instrumentSelect.addEventListener('change', () => {
  const instrument = instrumentSelect.value;

  if (useWebMIDI) {
    if (instrument === 'piano') {
      addLog('🎹 ピアノ音色に変更しました。Windows標準MIDI音源で再生されます。');
    } else if (instrument === 'sax') {
      addLog('🎷 サックス音色に変更しました。Windows標準MIDI音源で再生されます。');
    }
  } else {
    if (instrument === 'piano') {
      if (pianoSampler) {
        addLog('🎹 ピアノ音色に変更しました。リアルなピアノサンプルで再生されます。');
      } else {
        addLog('⚠️ ピアノ音色に変更しました。ピアノサンプラーが利用できないため、基本シンセを使用します。');
      }
    } else if (instrument === 'sax') {
      if (saxSynth) {
        addLog('🎷 サックス音色に変更しました。改良されたシンセサイザーで再生されます。');
      } else {
        addLog('⚠️ サックス音色に変更しました。サックスシンセが利用できないため、基本シンセを使用します。');
      }
    }
  }

  // 現在再生中の場合は停止
  if (playing) {
    stopPlayback();
  }
});

// Initialize Web MIDI API
async function initializeWebMIDI() {
  try {
    if (navigator.requestMIDIAccess) {
      midiAccess = await navigator.requestMIDIAccess();

      // 利用可能なMIDI出力デバイスを確認
      const outputs = Array.from(midiAccess.outputs.values());

      if (outputs.length > 0) {
        // 最初の利用可能な出力デバイスを使用
        midiOutput = outputs[0];
        useWebMIDI = true;
        addLog(`✅ Web MIDI APIを初期化しました。デバイス: ${midiOutput.name || 'Unknown'}`);
        return true;
      } else {
        addLog('⚠️ MIDI出力デバイスが見つかりませんでした。');
        return false;
      }
    } else {
      addLog('⚠️ Web MIDI APIがサポートされていません。');
      return false;
    }
  } catch (error) {
    console.error('Web MIDI API初期化エラー:', error);
    addLog('❌ Web MIDI APIの初期化に失敗しました。');
    return false;
  }
}

// Initialize audio instruments
async function initializeAudio() {
  try {
    addLog('音声エンジンを初期化中...');

    // まずWeb MIDI APIを試す
    const midiSuccess = await initializeWebMIDI();

    if (midiSuccess) {
      addLog('🎵 Windows標準MIDI音源を使用して高品質な音を再生できます。');
      return; // Web MIDIが成功した場合は他の音声エンジンは不要
    }

    // Web MIDIが失敗した場合のフォールバック
    addLog('Web MIDI APIが利用できません。Web Audio APIを使用します。');

    // まず基本シンセを作成（フォールバック用）
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.4,
        release: 0.8
      }
    }).toDestination();

    // サックス用の改良されたシンセ（よりリアルな音色）
    saxSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sawtooth"
      },
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.6,
        release: 1.5
      },
      filterEnvelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.4,
        release: 1.0,
        baseFrequency: 100,
        octaves: 4
      }
    }).toDestination();

    // より高品質なサックス用の追加シンセ（ハーモニクス用）
    const saxHarmonics = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.2,
        decay: 0.4,
        sustain: 0.3,
        release: 1.0
      }
    }).toDestination();

    // サックスシンセを組み合わせてよりリアルな音色を作成
    saxSynth.connect(saxHarmonics);

    // ピアノサンプラーを初期化（より高品質なサンプル）
    try {
      // より軽量で確実なサンプル音源を使用
      pianoSampler = new Tone.Sampler({
        urls: {
          "C4": "C4.mp3",
          "C5": "C5.mp3",
          "C6": "C6.mp3"
        },
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        release: 1.5,
        attack: 0.05,
        onload: () => {
          addLog('✅ ピアノサンプルの読み込みが完了しました。');
        },
        onerror: (error) => {
          console.error('ピアノサンプル読み込みエラー:', error);
          addLog('⚠️ ピアノサンプルの読み込みに失敗しました。');
        }
      }).toDestination();

      // サンプラーの読み込み完了を待つ（タイムアウト付き）
      await Promise.race([
        pianoSampler.loaded(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('タイムアウト')), 5000))
      ]);

      addLog('✅ 高品質ピアノサンプラーを初期化しました。');
    } catch (pianoError) {
      console.warn('ピアノサンプラー初期化エラー:', pianoError);
      addLog('⚠️ ピアノサンプラーの初期化に失敗しました。改良されたピアノシンセを使用します。');

      // フォールバック用の改良されたピアノシンセ
      pianoSampler = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "triangle"
        },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.3,
          release: 1.0
        },
        filterEnvelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0.2,
          release: 0.8,
          baseFrequency: 200,
          octaves: 2.6
        }
      }).toDestination();

      addLog('✅ 改良されたピアノシンセを作成しました。');
    }

    // エフェクトを追加（オプション）
    try {
      // リバーブ（空間感）
      const reverb = new Tone.Reverb({
        decay: 2.0,
        wet: 0.2,
        preDelay: 0.1
      }).toDestination();

      // ディレイ（エコー効果）
      const delay = new Tone.PingPongDelay({
        delayTime: "8n",
        feedback: 0.2,
        wet: 0.1
      }).toDestination();

      // コンプレッサー（音のダイナミクス制御）
      const compressor = new Tone.Compressor({
        threshold: -24,
        ratio: 3,
        attack: 0.1,
        release: 0.1
      }).toDestination();

      // エフェクトチェーンを接続
      if (pianoSampler) {
        pianoSampler.chain(compressor, delay, reverb, Tone.destination);
      }
      saxSynth.chain(compressor, delay, reverb, Tone.destination);

      addLog('✅ 高品質エフェクトを追加しました。');
    } catch (effectError) {
      console.warn('エフェクト初期化エラー:', effectError);
      // エフェクトなしでも動作するので無視
      addLog('⚠️ エフェクトの初期化に失敗しました。基本音色で再生します。');
    }

    addLog('🎵 Web Audio API音声エンジンの初期化が完了しました。');

  } catch (error) {
    console.error('音声初期化エラー:', error);
    addLog('❌ 音声初期化に失敗しました。基本シンセサイザーを使用します。');
    // フォールバック用の基本シンセ（既に作成済み）
  }
}

// Play the current grid using improved audio
async function playGrid() {
  if (playing) return;

  // Web MIDI APIを使用する場合
  if (useWebMIDI && midiOutput) {
    await playGridWithWebMIDI();
    return;
  }

  // 音声エンジンが初期化されていない場合は初期化
  if (!pianoSampler && !saxSynth && !synth) {
    await initializeAudio();
  }

  await Tone.start();
  Tone.Transport.bpm.value = 120;

  const bpm = Tone.Transport.bpm.value;
  const barDuration = (60 / bpm) * 4;
  const stepDuration = barDuration / stepsPerBar;

  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;

  const instrument = instrumentSelect.value;
  let currentSynth = synth; // フォールバック用

  // 楽器に応じて適切なシンセを選択（デバッグ情報付き）
  if (instrument === 'piano') {
    if (pianoSampler) {
      currentSynth = pianoSampler;
      addLog('🎹 ピアノサンプラーを使用して再生します。');
    } else {
      addLog('⚠️ ピアノサンプラーが利用できません。基本シンセを使用します。');
      currentSynth = synth;
    }
  } else if (instrument === 'sax') {
    if (saxSynth) {
      currentSynth = saxSynth;
      addLog('🎷 サックスシンセを使用して再生します。');
    } else {
      addLog('⚠️ サックスシンセが利用できません。基本シンセを使用します。');
      currentSynth = synth;
    }
  }

  // シンセが利用できない場合の最終フォールバック
  if (!currentSynth) {
    addLog('❌ 音声エンジンが利用できません。基本シンセを作成します。');
    currentSynth = new Tone.PolySynth(Tone.Synth).toDestination();
  }

  // 現在の音声エンジンの状態をログに出力
  addLog(`🔧 音声エンジン状態: ピアノサンプラー=${pianoSampler ? '利用可能' : '利用不可'}, サックスシンセ=${saxSynth ? '利用可能' : '利用不可'}, 基本シンセ=${synth ? '利用可能' : '利用不可'}`);

  let noteCount = 0;
  for (let r = 0; r < PITCH_COUNT; r++) {
    let c = 0;
    while (c < totalSteps) {
      if (grid[r][c]) {
        const start = c;
        let end = c;
        while (end + 1 < totalSteps && grid[r][end + 1]) {
          end++;
        }
        const durationSteps = end - start + 1;
        const eventTime = start * stepDuration;
        const durationSec = durationSteps * stepDuration;
        const noteName = NOTE_NAMES[r];

        Tone.Transport.schedule((time) => {
          if (currentSynth) {
            try {
              // 楽器に応じてベロシティとエクスプレッションを調整
              let velocity = 0.8;
              let expression = 1.0;

              if (instrument === 'piano') {
                // ピアノの場合はノートの長さと音域に応じてベロシティを調整
                velocity = 0.7;
                if (durationSec < 0.3) {
                  velocity = 0.5; // 短いノートは弱く
                } else if (durationSec > 1.5) {
                  velocity = 0.8; // 長いノートは強く
                }

                // 音域による調整
                const noteIndex = r;
                if (noteIndex < 48) { // 低音域
                  velocity *= 0.9;
                } else if (noteIndex > 84) { // 高音域
                  velocity *= 1.1;
                }
              } else if (instrument === 'sax') {
                velocity = 0.8;
                expression = 0.9;

                // サックスの場合は音の高さと長さに応じてベロシティを調整
                const noteIndex = r;
                if (noteIndex < 60) { // 低音域
                  velocity = 0.9;
                } else if (noteIndex > 80) { // 高音域
                  velocity = 0.7;
                }

                // 長いノートは少し強く
                if (durationSec > 1.0) {
                  velocity *= 1.1;
                }
              }

              // ベロシティの範囲を制限
              velocity = Math.max(0.3, Math.min(1.0, velocity));

              currentSynth.triggerAttackRelease(noteName, durationSec, time, velocity);
            } catch (error) {
              console.error('ノート再生エラー:', error, noteName, durationSec, time, velocity);
            }
          }
        }, eventTime);
        noteCount++;
        c = end + 1;
      } else {
        c++;
      }
    }
  }

  if (noteCount === 0) {
    addLog('再生するノートが見つかりません。');
    return;
  }

  addLog(`${noteCount}個のノートをスケジュールしました。再生を開始します。`);

  Tone.Transport.scheduleOnce(() => {
    playing = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    if (playheadInterval) clearInterval(playheadInterval);
    playheadStep = null;
  }, totalSteps * stepDuration);

  playheadStep = 0;
  playheadInterval = setInterval(() => {
    playheadStep++;
    if (playheadStep >= totalSteps) {
      clearInterval(playheadInterval);
      playheadStep = null;
    }
  }, stepDuration * 1000);

  Tone.Transport.start();
  playing = true;
  playBtn.disabled = true;
  stopBtn.disabled = false;
}

// Web MIDI APIを使用した再生機能
async function playGridWithWebMIDI() {
  if (!midiOutput) {
    addLog('❌ MIDI出力デバイスが利用できません。');
    return;
  }

  addLog('🎵 Web MIDI APIを使用してWindows標準MIDI音源で再生します。');

  const bpm = 120;
  const barDuration = (60 / bpm) * 4;
  const stepDuration = barDuration / stepsPerBar;
  const instrument = instrumentSelect.value;

  // 楽器に応じてMIDIプログラムを設定
  let program = 0; // ピアノ
  if (instrument === 'sax') {
    program = 64; // アルトサックス
  }

  // プログラムチェンジを送信
  midiOutput.send([0xC0, program]);

  let noteCount = 0;
  const scheduledNotes = [];

  for (let r = 0; r < PITCH_COUNT; r++) {
    let c = 0;
    while (c < totalSteps) {
      if (grid[r][c]) {
        const start = c;
        let end = c;
        while (end + 1 < totalSteps && grid[r][end + 1]) {
          end++;
        }
        const durationSteps = end - start + 1;
        const startTime = start * stepDuration * 1000; // ミリ秒
        const durationMs = durationSteps * stepDuration * 1000;
        const noteNumber = r;
        const velocity = 80; // MIDIベロシティ（0-127）

        // ノート開始
        setTimeout(() => {
          midiOutput.send([0x90, noteNumber, velocity]); // Note On
        }, startTime);

        // ノート終了
        setTimeout(() => {
          midiOutput.send([0x80, noteNumber, 0]); // Note Off
        }, startTime + durationMs);

        scheduledNotes.push({ startTime, durationMs, noteNumber });
        noteCount++;
        c = end + 1;
      } else {
        c++;
      }
    }
  }

  if (noteCount === 0) {
    addLog('再生するノートが見つかりません。');
    return;
  }

  addLog(`${noteCount}個のノートをWindows標準MIDI音源でスケジュールしました。`);

  // 再生状態を設定
  playing = true;
  playBtn.disabled = true;
  stopBtn.disabled = false;

  // 再生終了のタイマーを設定
  const totalDuration = totalSteps * stepDuration * 1000;
  setTimeout(() => {
    playing = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    addLog('Web MIDI再生が完了しました。');
  }, totalDuration);
}

// Stop playback
function stopPlayback() {
  // Web MIDI APIを使用している場合
  if (useWebMIDI && midiOutput) {
    // すべてのノートを停止（All Notes Off）
    for (let channel = 0; channel < 16; channel++) {
      midiOutput.send([0xB0 + channel, 0x7B, 0]); // All Notes Off
    }
    addLog('Web MIDI再生を停止しました。');
  } else {
    // Web Audio APIの場合
    if (synth) {
      synth.triggerRelease();
    }
    if (pianoSampler) {
      pianoSampler.triggerRelease();
    }
    if (saxSynth) {
      saxSynth.triggerRelease();
    }

    Tone.Transport.stop();
    Tone.Transport.cancel();
  }

  playing = false;
  playBtn.disabled = false;
  stopBtn.disabled = true;
  if (playheadInterval) {
    clearInterval(playheadInterval);
    playheadInterval = null;
  }
  playheadStep = null;
}

playBtn.addEventListener('click', () => {
  playGrid();
});

stopBtn.addEventListener('click', () => {
  stopPlayback();
});

// Generate MIDI using jsmidgen and allow downloading
generateBtn.addEventListener('click', () => {
  if (!midiLoaded || selectedBars === 0) return;
  const temperature = parseFloat(temperatureInput.value);
  const numOutputs = parseInt(numOutputsInput.value, 10);
  const selectedModelName = document.querySelector('.model-tab.active').textContent;
  addLog(`モデル「${selectedModelName}」で${selectedBars}小節を基に旋律を${numOutputs}個生成します。（ダミー関数を使用）`);

  downloadContainer.innerHTML = '';
  candidatesContainer.innerHTML = '';
  candidates = [];
  currentCandidateIndex = -1;

  for (let i = 0; i < numOutputs; i++) {
    const midiData = buildMidiFromGrid(selectedBars);
    const blob = new Blob([midiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const candidateGrid = grid.map((row) => row.slice());
    candidates.push({ grid: candidateGrid, url });

    const link = document.createElement('a');
    link.href = url;
    link.download = `mortm_output_${i + 1}.mid`;
    link.textContent = `生成結果${i + 1}`;
    downloadContainer.appendChild(link);
  }

  if (candidates.length > 0) {
    candidatesContainer.style.display = 'flex';
    candidates.forEach((cand, idx) => {
      const tab = document.createElement('div');
      tab.className = 'candidate-tab';
      tab.textContent = `候補${idx + 1}`;
      tab.dataset.index = idx;
      tab.addEventListener('click', () => {
        currentCandidateIndex = idx;
        const allTabs = candidatesContainer.querySelectorAll('.candidate-tab');
        allTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        grid = cand.grid.map((row) => row.slice());
      });
      candidatesContainer.appendChild(tab);
    });
    const firstTab = candidatesContainer.querySelector('.candidate-tab');
    if (firstTab) firstTab.click();
  }
  addLog('生成が完了しました。候補タブやダウンロードリンクからMIDIファイルを取得できます。');
});

// Build a MIDI file from the current grid using jsmidgen
function buildMidiFromGrid(numBars) {
  const MidiWriter = Midi;
  const file = new MidiWriter.File();
  const track = new MidiWriter.Track();
  file.addTrack(track);

  track.setTempo(120);

  let program = 0;
  const selectedInstr = (typeof instrumentSelect !== 'undefined' ? instrumentSelect.value : 'piano');
  if (selectedInstr === 'sax') {
    program = 64;
  } else {
    program = 0;
  }
  track.setInstrument(0, program);

  const maxStep = numBars * stepsPerBar;
  const ticksPerStep = 512 / stepsPerBar;

  let currentTick = 0;
  for (let r = 0; r < PITCH_COUNT; r++) {
    let c = 0;
    while (c < maxStep) {
      if (grid[r][c]) {
        const start = c;
        let end = c;
        while (end + 1 < maxStep && grid[r][end + 1]) {
          end++;
        }
        const durationSteps = end - start + 1;
        const startTick = Math.round(start * ticksPerStep);
        const durationTicks = Math.round(durationSteps * ticksPerStep);
        const wait = startTick - currentTick;
        const note = NOTE_NAMES[r].toLowerCase();
        track.addNote(0, note, durationTicks, wait);
        currentTick = startTick + durationTicks;
        c = end + 1;
      } else {
        c++;
      }
    }
  }

  const bytes = file.toBytes();
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    buffer[i] = bytes.charCodeAt(i);
  }
  return buffer;
}

// Initialise: add a welcome message and initialize audio
addLog('ようこそ！モデルと入力MIDIを選択して生成を始めてください。');

// ページ読み込み完了後に音声エンジンを初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeAudio();
    addLog('音声エンジンの初期化が完了しました。');
  } catch (error) {
    console.error('初期化エラー:', error);
    addLog('音声エンジンの初期化に失敗しました。');
  }
});

// Initially disable controls until a MIDI or sample is loaded
disableControls();