import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import JSZip from 'jszip';
import { Loader2, AlertCircle, CheckCircle2, Info, Music } from 'lucide-react';
import Soundfont from 'soundfont-player';
import Header from './components/Header.jsx';
import MidiInput from './components/MidiInput.jsx';
import Settings from './components/Settings.jsx';
import AdvancedSettings from './components/AdvancedSettings.jsx';
import Controls from './components/Controls.jsx';
import PianoRoll from './components/PianoRoll.jsx';
import { GM_INSTRUMENTS } from './constants/instrumentNames';
import Sidebar from './components/Sidebar.jsx';
import VSMode from './components/VSMode.jsx';
import PodcastMode from './components/PodcastMode.jsx';
import KeySelector from './components/KeySelector.jsx';

const API_BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_URL
  : '';

const ALL_GENRES = [
  '80s', '90s', 'alternative', 'ambient', 'blues', 'celtic', 'chillout',
  'classical', 'country', 'dance', 'drumnbass', 'easylistening', 'electronic',
  'electropop', 'experimental', 'folk', 'funk', 'hiphop', 'house', 'indie',
  'instrumentalpop', 'instrumentalrock', 'jazz', 'jazzfusion', 'latin', 'lounge',
  'metal', 'newage', 'orchestral', 'pop', 'popfolk', 'poprock', 'punkrock',
  'reggae', 'rock', 'soundtrack', 'swing', 'symphonic', 'synthpop', 'techno',
  'trance', 'world'
];

function App() {
  const [debugMode, setDebugMode] = useState(false);
  const [activeMode, setActiveMode] = useState('DEMO');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      const code = prompt('Enter debug code:');
      if (code === '963964') {
        setDebugMode(true);
      }
    }
  }, []);

  const [midiData, setMidiData] = useState(null);
  const [originalMidi, setOriginalMidi] = useState(null);
  const [playbackState, setPlaybackState] = useState('stopped');
  const [progress, setProgress] = useState(0);
  const [samplerLoaded, setSamplerLoaded] = useState(false);
  const [generationLength, setGenerationLength] = useState(12);
  const [instrument, setInstrument] = useState('piano');
  const [tempo, setTempo] = useState(120);
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.95);
  const [p, setP] = useState(0.95);
  const [numGems, setNumGems] = useState(3);
  const [key, setKey] = useState('C M');
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [densities, setDensities] = useState({});
  const [selectedTask, setSelectedTask] = useState('Meta2MIDI');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [thinking, setThinking] = useState(true);
  const [generationReasons, setGenerationReasons] = useState(null);

  const [sftLocked, setSftLocked] = useState(false);
  const [customKey, setCustomKey] = useState(null);
  const [customDensities, setCustomDensities] = useState(null);
  const [showSftMetadataModal, setShowSftMetadataModal] = useState(false);
  const [showSftIncrementalConfigModal, setShowSftIncrementalConfigModal] = useState(false);
  const [sftTask, setSftTask] = useState('auto');
  const [customTask, setCustomTask] = useState(null);
  const [cotTemperature, setCotTemperature] = useState(0.1);

  const [modelInfo, setModelInfo] = useState([]);
  const selectedModelObject = useMemo(() =>
    modelInfo.find(m => m.model_name === selectedModel)
  , [modelInfo, selectedModel]);
  const isSft = selectedModelObject?.tag?.model === 'sft_gen' || selectedModelObject?.tag?.model === 'sft';
  const [generatedMidis, setGeneratedMidis] = useState([]);
  const [selectedGeneratedMidi, setSelectedGeneratedMidi] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [chords, setChords] = useState({});
  const [debugInfo, setDebugInfo] = useState(null);
  const [trackMutes, setTrackMutes] = useState({});
  const [trackSolos, setTrackSolos] = useState({});
  const [showServiceUnavailableModal, setShowServiceUnavailableModal] = useState(false);
  const [generationRange, setGenerationRange] = useState(null);
  const [lastTask, setLastTask] = useState('');

  const scheduledEventsRef = useRef([]);
  const pianoRollRef = useRef();

  const schedulingStrategyRef = useRef('replace');
  const lastScheduledTimeRef = useRef(0);

  const handleAppendMidi = (newMidi) => {
    schedulingStrategyRef.current = 'append';
    setMidiData(newMidi);
  };

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/model_info`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': '1'
          }
        });

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        const modelArray = Object.values(data);
        setModelInfo(modelArray);
      } catch (error) {
        console.error('Failed to fetch model info:', error);
        setShowServiceUnavailableModal(true);
      }
    };

    fetchModelInfo();
  }, []);

  const [instruments, setInstruments] = useState([]);

  useEffect(() => {
    // skip instrument reload during append mode to prevent audio glitches
    if (schedulingStrategyRef.current === 'append') {
      console.log('Skipping instrument reload (Append Mode)');
      return;
    }

    console.log('Instrument loading effect running');
    setSamplerLoaded(false);

    // Dispose old instruments and gains
    instruments.forEach(inst => {
      if (inst.type === 'tone') {
        inst.player.dispose();
      }
      // Native gains don't have dispose, just disconnect
      if (inst.gain) {
        inst.gain.disconnect();
      }
    });

    if (!midiData) {
      console.log('No midiData, resetting instruments');
      setInstruments([]);
      setSamplerLoaded(true);
      return;
    }

    const loadInstruments = async () => {
      const promises = midiData.tracks.map(async (track, i) => {
        const program = track.instrument.number;
        const isDrum = track.instrument.percussion || track.channel === 9;

        // Create a native Gain node for volume control
        const gainNode = Tone.context.createGain();
        Tone.connect(gainNode, Tone.Destination);

        let player;
        let type;

        console.log(`Loading track ${i}: Program ${program}, Drum: ${isDrum}`);

        if (isDrum) {
          type = 'tone';
          console.log('Loading Salamander Drumkit...');
          player = new Tone.Sampler({
            urls: {
              35: "kick_OH_FF_1.wav",
              36: "kick2_OH_FF_1.wav",
              37: "snareStick_OH_F_1.wav",
              38: "snare_OH_FF_1.wav",
              40: "snare2_OH_FF_1.wav",
              41: "loTom_OH_FF_1.wav",
              42: "hihatClosed_OH_F_1.wav",
              43: "loTom_OH_FF_6.wav",
              44: "hihatFoot_OH_MP_1.wav",
              45: "hiTom_OH_FF_1.wav",
              46: "hihatOpen_OH_FF_1.wav",
              47: "hiTom_OH_FF_1.wav",
              48: "hiTom_OH_FF_4.wav",
              49: "crash1_OH_FF_1.wav",
              50: "hiTom_OH_FF_8.wav",
              51: "ride1_OH_FF_1.wav",
              52: "china1_OH_FF_1.wav",
              53: "ride1Bell_OH_F_1.wav",
              55: "splash1_OH_F_1.wav",
              57: "crash2_OH_FF_1.wav",
              59: "ride2_OH_FF_1.wav",
            },
            baseUrl: "drums/OH/",
            onload: () => {
              console.log('Salamander Drumkit loaded!');
            }
          });
          player.connect(gainNode);
          // Tone.Sampler is async but we want to wait for it?
          // Actually Tone.loaded() waits for all buffers.
          await Tone.loaded();
        } else if (program >= 0 && program <= 7) {
          type = 'tone';
          player = new Tone.Sampler({
            urls: {
              A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
              C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3', C3: 'C3.mp3',
              'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3',
              'F#4': 'Fs4.mp3', A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
              A5: 'A5.mp3', C6: 'C6.mp3',
            },
            release: 1,
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
          });
          player.connect(gainNode);
          await Tone.loaded();
        } else {
          type = 'soundfont';
          const instrumentName = GM_INSTRUMENTS[program] || 'acoustic_grand_piano';
          console.log(`Fetching Soundfont: ${instrumentName}`);
          try {
            player = await Soundfont.instrument(Tone.context.rawContext, instrumentName, {
              destination: gainNode,
              soundfont: 'FluidR3_GM'
            });
          } catch (e) {
            console.error(`Failed to load soundfont ${instrumentName}, falling back to synth`, e);
            type = 'tone';
            player = new Tone.PolySynth(Tone.Synth);
            player.connect(gainNode);
          }
        }

        return { player, gain: gainNode, type };
      });

      try {
        const loadedInstruments = await Promise.all(promises);
        console.log('All instruments loaded');
        setInstruments(loadedInstruments);
        setSamplerLoaded(true);
      } catch (error) {
        console.error('Error loading instruments:', error);
        setSamplerLoaded(true); // Proceed anyway?
      }
    };

    loadInstruments();

    return () => {
      // Cleanup function (handled at start of effect)
    };
  }, [midiData]);

  // Sync Mutes/Solos with Instruments
  useEffect(() => {
    const isSoloActive = Object.values(trackSolos).some(s => s);
    instruments.forEach((inst, index) => {
      if (inst && inst.gain) {
        let shouldPlay = true;
        if (isSoloActive) {
          shouldPlay = trackSolos[index];
        } else {
          shouldPlay = !trackMutes[index];
        }
        inst.gain.gain.value = shouldPlay ? 1 : 0;
      }
    });
  }, [trackMutes, trackSolos, instruments]);

  useEffect(() => {
    // Only compile playback schedule if we are actively playing.
    // This prevents blocking the JS main thread upon generation completion or edit actions.
    if (playbackState !== 'playing') {
      if (scheduledEventsRef.current.length > 0) {
        console.log('Clearing scheduled events (playback inactive)...');
        scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
        scheduledEventsRef.current = [];
        lastScheduledTimeRef.current = 0;
      }
      return;
    }

    console.log('Scheduling effect running (playback active)', {
      midiData: !!midiData,
      samplerLoaded,
      instrumentsLength: instruments.length,
      tracksLength: midiData?.tracks.length
    });

    if (midiData && samplerLoaded && instruments.length === midiData.tracks.length) {
      console.log(`Starting scheduling (Strategy: ${schedulingStrategyRef.current})...`);

      let newScheduledEvents = [];

      if (schedulingStrategyRef.current === 'replace') {
        // Clear previous events first
        scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
        scheduledEventsRef.current = [];
        lastScheduledTimeRef.current = 0;
      } else {
        // Append mode: Keep existing events
        newScheduledEvents = [...scheduledEventsRef.current];
      }

      midiData.tracks.forEach((track, index) => {
        const instObj = instruments[index];
        if (instObj) {
          track.notes.forEach(note => {
            // Only schedule if note is new (starts after last scheduled time)
            // tolerance of 0.001s
            if (note.time >= lastScheduledTimeRef.current - 0.001) {
              const eventId = Tone.Transport.schedule(time => {
                if (instObj.type === 'tone') {
                  instObj.player.triggerAttackRelease(note.name, note.duration, time, note.velocity);
                } else if (instObj.type === 'soundfont') {
                  // soundfont-player play method: play(note, time, { duration, gain })
                  instObj.player.play(note.name, time, {
                    duration: note.duration,
                    gain: note.velocity
                  });
                }
              }, note.time);
              newScheduledEvents.push(eventId);
            }
          });
        }
      });

      console.log(`Scheduled ${newScheduledEvents.length - (schedulingStrategyRef.current === 'append' ? scheduledEventsRef.current.length : 0)} new events`);
      scheduledEventsRef.current = newScheduledEvents;

      // Update last scheduled time to current duration
      lastScheduledTimeRef.current = midiData.duration;

      // Update loop end
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = midiData.duration;

      // Reset strategy to default
      schedulingStrategyRef.current = 'replace';

    } else {
      // If conditions are not met (e.g. loading or no midi), ensure we clear old events
      if (scheduledEventsRef.current.length > 0) {
        console.log('Clearing scheduled events (conditions not met)...');
        scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
        scheduledEventsRef.current = [];
        lastScheduledTimeRef.current = 0;
      }
    }
  }, [midiData, samplerLoaded, instruments, playbackState]);

  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  const handleMidiUpload = (newMidiData) => {
    if (playbackState !== 'stopped') {
      handleStop();
    }
    setTrackMutes({}); // Reset mutes
    setMidiData(newMidiData);
    setOriginalMidi(newMidiData);
    setGeneratedMidis([]);
    setGenerationRange(null);
    if (newMidiData.header.tempos.length > 0) {
      setTempo(Math.round(newMidiData.header.tempos[0].bpm));
    }
  };

  const handlePlay = async () => {
    console.log('handlePlay called', { midiData: !!midiData, samplerLoaded });
    if (!midiData || !samplerLoaded) return;
    if (Tone.context.state !== 'running') await Tone.start();
    Tone.Transport.start();
    setPlaybackState('playing');
  };

  const handlePause = () => {
    Tone.Transport.pause();
    setPlaybackState('paused');
  };

  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setProgress(0);
    setPlaybackState('stopped');
  };

  const handleSeek = (time) => {
    Tone.Transport.position = time;
    setProgress(Tone.Transport.progress);
  };

  const getChordText = (chord) => {
    if (!chord) return '';
    const quality = chord.quality === 'None' ? '' : chord.quality;
    const base = chord.base === 'None' ? '' : chord.base;
    return `${chord.root}${quality}${base}`;
  }


  const generateMidi = async (targetModelName, targetNotes, targetRange, targetChords, targetMidiData, overrideMeta = {}, customContext = {}) => {
    if (!targetModelName) {
      setNotification({ open: true, message: "Model not selected.", severity: 'warning' });
      return null;
    }

    const getProgramFromInstrument = (instName) => {
      const name = String(instName).toUpperCase();
      if (name.includes('PIANO')) return 0;
      if (name.includes('SAX')) return 65;
      return 0; // Default to Piano
    };

    const modelObject = modelInfo.find(model => model.model_name === targetModelName);
    const modelType = modelObject?.tag?.model;
    const rules = modelObject?.rule || {};
    const useChord = rules.use_chord || rules.send_chord || false;

    const midi = new Midi();
    const track = midi.addTrack();
    
    // Set program based on the first selected instrument if available
    const primaryInstrument = selectedInstruments[0] || 'PIANO';
    track.instrument.number = getProgramFromInstrument(primaryInstrument);

    targetNotes.forEach(note => {
      track.addNote({ midi: note.midi, time: note.time, duration: note.duration, velocity: note.velocity });
    });


    const midiBlob = new Blob([midi.toArray()], { type: 'audio/midi' });

    const chordEntries = Object.entries(targetChords || {});
    const hasChords = chordEntries.length > 0;

    const meta = {
      model_type: targetModelName,
      program: selectedInstruments,
      tempo: tempo,
      task: hasChords ? "Chord2MIDI" : "Meta2MIDI",
      p: p,
      temperature: temperature,
      split_measure: 99,
      key: key === 'Auto' ? null : (key.includes('Major') ? key.replace(' Major', 'M') : key.replace(' Minor', 'm')),
      num_gems: numGems,
      thinking: thinking
    };

    if (rules.send_genre && selectedGenres.length > 0) {
      meta.genre = selectedGenres;
    }

    if (hasChords) {
      const measures = chordEntries.map(([k]) => parseInt(k.split('-')[0]));
      const minMeasure = Math.min(...measures);
      const maxMeasure = Math.max(...measures);
      const measureCount = maxMeasure - minMeasure + 1;
      meta.generate_count = measureCount;
      meta.genfield_measure = measureCount;
    } else if (rules.gen_measure_count && targetRange) {
      const measureCount = targetRange[1] - targetRange[0] + 1;
      meta.generate_count = measureCount;
      meta.genfield_measure = measureCount;
    }

    if (useChord || hasChords) {
      const promptEndTime = targetNotes.reduce((max, note) => Math.max(max, note.time + note.duration), 0);

      const bpm = targetMidiData?.header.tempos[0]?.bpm || tempo || 120;
      const timeSignature = targetMidiData?.header.timeSignatures[0]?.timeSignature || [4, 4];
      const beatsPerMeasure = timeSignature[0];
      const secondsPerBeat = 60 / bpm;
      const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;

      const measures = chordEntries.map(([k]) => parseInt(k.split('-')[0]));
      const minMeasure = measures.length > 0 ? Math.min(...measures) : 0;
      const rangeStartTime = minMeasure * secondsPerMeasure;

      const allChordTimings = Object.entries(targetChords || {}).map(([key, value]) => {
        const [measure, beat] = key.split('-').map(Number);
        const startTime = (measure * secondsPerMeasure) + (beat * secondsPerBeat);
        return { chord: value, startTime };
      });

      // For Chord2MIDI, times are relative to the start of the generation range
      // For Meta2MIDI, they are relative to promptEndTime
      const referenceTime = meta.task === "Chord2MIDI" ? rangeStartTime : promptEndTime;
      const filteredChords = allChordTimings.filter(c => c.startTime >= referenceTime);
      if (filteredChords.length > 0) {
        meta.chord_item = filteredChords.map(c => getChordText(c.chord));
        meta.chord_times = filteredChords.map(c => c.startTime - referenceTime);
      }
    }

    const finalMeta = { ...meta, ...overrideMeta };
    const metaBlob = new Blob([JSON.stringify(finalMeta, null, 2)], { type: 'application/json' });

    const formData = new FormData();
    formData.append('meta_json', metaBlob, 'meta.json');

    if (customContext?.conditionsMidiBlob) {
      formData.append('conditions_midi', customContext.conditionsMidiBlob, 'conditions.mid');
    } else if (targetNotes.length > 0) {
      const midiBlob = new Blob([midi.toArray()], { type: 'audio/midi' });
      formData.append('conditions_midi', midiBlob, 'input.mid');
    }

    if (customContext?.pastMidiBlob) {
      formData.append('past_midi', customContext.pastMidiBlob, 'past.mid');
    }
    if (customContext?.futureMidiBlob) {
      formData.append('future_midi', customContext.futureMidiBlob, 'future.mid');
    }


    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': '1'
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      if (modelObject?.tag?.model === 'sft_gen') {
        setSftLocked(true);
      }

      const reasonHeader = response.headers.get("X-Generation-Reason");
      if (reasonHeader) {
        try {
          const decoded = JSON.parse(decodeURIComponent(reasonHeader));
          setGenerationReasons(decoded);
        } catch (e) {
          console.error("Failed to parse X-Generation-Reason", e);
        }
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/zip")) {
        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);
        const midis = [];
        let jsonMessage = "";

        const entries = Object.entries(zip.files);
        for (const [relativePath, zipEntry] of entries) {
          if (zipEntry.name.endsWith('.mid')) {
            const buffer = await zipEntry.async('arraybuffer');
            midis.push(new Midi(buffer));
          } else if (zipEntry.name.endsWith('.json')) {
            jsonMessage += await zipEntry.async('string') + "\n";
          }
        }

        if (jsonMessage) {
          setNotification({ open: true, message: jsonMessage, severity: 'info' });
        }

        return midis;
      } else {
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        return [new Midi(arrayBuffer)];
      }
    } catch (error) {
      console.error(error);
      setNotification({ open: true, message: `Generation failed: ${error.message}`, severity: 'error' });
      return null;
    }
  };

  const handleGenerate = async (overrides = null) => {
    console.log("=== [STEP 1] handleGenerate Initialized ===");
    console.log("Current state:", { selectedModel, selectedInstruments, tempo, key, hasMidiData: !!midiData });
    if (!selectedModel) {
      console.warn("Generation aborted: No model selected.");
      setNotification({ open: true, message: "Please select a model first.", severity: 'warning' });
      return;
    }
    const modelObject = modelInfo.find(model => model.model_name === selectedModel);
    const modelType = modelObject?.tag?.model;
    const rules = modelObject?.rule || {};
    console.log("Model Info details:", { modelObject, modelType, rules });

    const notes = pianoRollRef.current?.getSelectedNotes() || [];
    const selectedRange = pianoRollRef.current?.getSelectedRange() || [0, 0];
    const hasSelection = selectedRange[0] !== 0 || selectedRange[1] !== 0;
    console.log("PianoRoll Selection details:", { notesCount: notes.length, selectedRange, hasSelection });

    // Validation for selection
    if (originalMidi && modelType !== 'foundation') {
      if (!hasSelection && modelType !== 'pretrained' && !rules.gen_measure_count) {
        console.warn("Validation failed: Selection required but not found.");
        setNotification({ open: true, message: "ピアノロールで生成元の小節を選択してください。", severity: 'warning' });
        return;
      }

      if (rules.gen_measure_count && !hasSelection) {
        console.warn("Validation failed: Range selection required.");
        setNotification({ open: true, message: "生成する小節の範囲を選択してください。", severity: 'warning' });
        return;
      }
    }

    console.log("=== [STEP 2] Setting Loading State and backing up originalMidi ===");
    setIsGenerating(true);
    setNotification({ open: true, message: "Generating... Please wait.", severity: 'info' });

    // FIX: Commit current midiData as originalMidi for context preservation
    if (midiData) {
      setOriginalMidi(new Midi(midiData.toArray()));
    }

    setGeneratedMidis([]);
    const chordEntries = Object.entries(chords || {});

    // 1. Determine Effective Range
    let effectiveRange = selectedRange;
    if (!hasSelection && chordEntries.length > 0) {
      const measures = chordEntries.map(([k]) => parseInt(k.split('-')[0]));
      effectiveRange = [Math.min(...measures), Math.max(...measures)];
    } else if (!hasSelection) {
      effectiveRange = null;
    }

    const measureCount = effectiveRange ? (effectiveRange[1] - effectiveRange[0] + 1) : 8;
    setGenerationRange(effectiveRange);

    const bpm = originalMidi?.header.tempos[0]?.bpm || tempo || 120;
    const timeSignature = originalMidi?.header.timeSignatures[0]?.timeSignature || [4, 4];
    const beatsPerMeasure = timeSignature[0];
    const secondsPerBeat = 60 / bpm;
    const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
    const selectionStartTime = effectiveRange ? effectiveRange[0] * secondsPerMeasure : 0;

    const getProgramFromInstrument = (instName) => {
      const name = String(instName).toUpperCase();
      if (name.includes('PIANO')) return 0;
      if (name.includes('SAX')) return 65;
      return 0; // Default to Piano
    };

    const midi = new Midi();
    midi.header.setTempo(bpm);
    const track = midi.addTrack();
    const activeInstruments = (overrides && overrides.instruments) ? overrides.instruments : (selectedInstruments || []);
    const primaryInstrument = activeInstruments[0] || 'PIANO';
    track.instrument.number = getProgramFromInstrument(primaryInstrument);

    notes.forEach(note => {
      track.addNote({ midi: note.midi, time: note.time, duration: note.duration, velocity: note.velocity });
    });

    const midiBlob = notes.length > 0 ? new Blob([midi.toArray()], { type: 'audio/midi' }) : null;

    // 2. Resolve Chords for this range (with carry-over)
    const allChordTimings = Object.entries(chords || {}).map(([key, value]) => {
      const [measure, beat] = key.split('-').map(Number);
      const startTime = (measure * secondsPerMeasure) + (beat * secondsPerBeat);
      return { chord: value, startTime };
    }).sort((a, b) => a.startTime - b.startTime);

    const chordsInRange = allChordTimings.filter(c => c.startTime >= selectionStartTime);
    const chordsBeforeRange = allChordTimings.filter(c => c.startTime < selectionStartTime);

    let finalChords = [];
    if (chordsInRange.length > 0) {
      if (chordsInRange[0].startTime > selectionStartTime && chordsBeforeRange.length > 0) {
        finalChords.push({ ...chordsBeforeRange[chordsBeforeRange.length - 1], startTime: selectionStartTime });
      }
      finalChords = [...finalChords, ...chordsInRange];
    } else if (chordsBeforeRange.length > 0) {
      finalChords.push({ ...chordsBeforeRange[chordsBeforeRange.length - 1], startTime: selectionStartTime });
    }

    const isSftIncremental = isSft && originalMidi && hasSelection;

    // SFT Task Routing Logic
    let effectiveSftTask = sftTask;
    let sendPast = false;
    let sendFuture = false;
    let sendCondition = false;

    if (isSft) {
      if (isSftIncremental && customTask !== null) {
        effectiveSftTask = customTask;
      }
      
      if (effectiveSftTask === 'auto') {
        const hasPastNotes = hasSelection ? (pianoRollRef.current?.getPastNotes(8) || []).length > 0 : (originalMidi ? true : false);
        const hasFutureNotes = hasSelection ? (pianoRollRef.current?.getFutureNotes(8) || []).length > 0 : false;
        
        if (hasPastNotes && hasFutureNotes) {
          effectiveSftTask = 'infill';
        } else if (hasPastNotes) {
          effectiveSftTask = 'meta_past';
        } else if (hasFutureNotes) {
          effectiveSftTask = 'meta_future';
        } else {
          const selectedNotes = pianoRollRef.current?.getSelectedNotes() || [];
          if (selectedNotes.length > 0) {
            effectiveSftTask = 'inst_comp';
          } else {
            effectiveSftTask = 'meta';
          }
        }
      }

      if (effectiveSftTask === 'infill') {
        sendPast = true;
        sendFuture = true;
      } else if (effectiveSftTask === 'meta_past') {
        sendPast = true;
      } else if (effectiveSftTask === 'meta_future') {
        sendFuture = true;
      } else if (effectiveSftTask === 'inst_comp') {
        sendCondition = true;
      } else { // meta
        // no context midi sent
      }
    }

    const currentTask = finalChords.length > 0 ? "Chord2MIDI" : "Meta2MIDI";
    setLastTask(isSft ? effectiveSftTask : currentTask);

    // Calculate chord time offset based on which context MIDI is sent and offset-corrected
    let chordTimeOffset = 0;
    const willSendPast = rules.send_context_past || isSft;
    const willSendCondition = rules.send_context_condition || (isSft && hasSelection);

    if (willSendPast) {
      // If past_midi is sent, pastStartTime (Math.max(0, selectionStartTime - 8 * secondsPerMeasure)) is the time-origin
      chordTimeOffset = hasSelection 
        ? Math.max(0, selectionStartTime - 8 * secondsPerMeasure)
        : 0;
    } else if (willSendCondition && hasSelection) {
      // If conditions_midi is sent as context, selectionStartTime is the time-origin
      chordTimeOffset = selectionStartTime;
    }

    console.log("Chord Alignment Debug:", { chordTimeOffset, willSendPast, willSendCondition, selectionStartTime });

    const programToSend = (activeInstruments && activeInstruments.length > 0)
      ? activeInstruments
      : ['PIANO'];

    let meta = {};
    if (modelType === 'foundation') {
      meta = {
        model_type: selectedModel,
        tempo: parseInt(tempo, 10) || 120,
        temperature: temperature,
        p: p,
        num_gems: numGems
      };
    } else if (isSftIncremental) {
      meta = {
        model_type: selectedModel,
        program: programToSend,
        tempo: parseInt(tempo, 10) || 120,
        task: isSft ? effectiveSftTask : currentTask,
        genfield_measure: isSft ? Math.max(1, Math.min(8, measureCount)) : Math.min(64, measureCount),
        generate_count: isSft ? Math.max(1, Math.min(8, measureCount)) : Math.min(64, measureCount),
        thinking: thinking,
        cot_temperature: cotTemperature
      };

      if (customKey !== null) {
        const formattedCustomKey = customKey === 'Auto' ? null : customKey
          .replace(' Major', 'M')
          .replace(' Minor', 'm')
          .replace(' M', 'M')
          .replace(' m', 'm')
          .replace(' ', '');
        meta.key = formattedCustomKey;
      }

      if (customDensities !== null) {
        meta.gen_note_dense = customDensities;
        meta.note_density = customDensities;
      }
    } else {
      const activeKey = (overrides && overrides.key) ? overrides.key : key;
      const activeDensities = (overrides && overrides.densities) ? overrides.densities : densities;
      const activeGenres = (overrides && overrides.genres) ? overrides.genres : selectedGenres;

      // Key formatting: "C M" -> "CM", "A Major" -> "AM", "B Minor" -> "Bm"
      const formattedKey = activeKey === 'Auto' ? null : activeKey
        .replace(' Major', 'M')
        .replace(' Minor', 'm')
        .replace(' M', 'M')
        .replace(' m', 'm')
        .replace(' ', '');

      meta = {
        model_type: selectedModel,
        program: programToSend,
        tempo: parseInt(tempo, 10) || 120,
        task: isSft ? effectiveSftTask : currentTask,
        p: p,
        temperature: temperature,
        split_measure: 99,
        key: formattedKey,
        num_gems: isSft ? 1 : numGems,
        genfield_measure: isSft ? Math.max(1, Math.min(8, measureCount)) : Math.min(64, measureCount),
        thinking: thinking,
        cot_temperature: cotTemperature
      };

      if ((rules.send_genre || isSft) && activeGenres.length > 0) {
        meta.genre = activeGenres;
      }

      if (rules.gen_note_dense || isSft) {
        const densityPayload = {};
        activeInstruments.forEach(inst => { if (activeDensities[inst]) densityPayload[inst] = activeDensities[inst]; });
        meta.gen_note_dense = densityPayload;
        meta.note_density = densityPayload;
      }
    }

    if (!isSftIncremental) {
      if (currentTask === "Chord2MIDI") {
        meta.chord_item = finalChords.map(c => getChordText(c.chord));
        meta.chord_times = finalChords.map(c => Math.max(0, c.startTime - chordTimeOffset));
      } else if (rules.use_chord || rules.send_chord) {
        const promptEndTime = notes.length > 0 ? notes.reduce((max, note) => Math.max(max, note.time + note.duration), 0) : 0;
        const metaFilteredChords = allChordTimings.filter(c => c.startTime >= promptEndTime);
        if (metaFilteredChords.length > 0) {
          meta.chord_item = metaFilteredChords.map(c => getChordText(c.chord));
          meta.chord_times = metaFilteredChords.map(c => Math.max(0, c.startTime - chordTimeOffset));
        }
      }
    }

    if (debugMode) {
      setDebugInfo({ meta });
    }

    // Detailed Generation Log for debugging
    console.group("🚀 Generation Request Debug Information");
    console.log("Selected Model:", selectedModel);
    console.log("Task Type:", currentTask);
    console.log("Applied Range (Measures):", effectiveRange);
    console.log("Measure Count:", measureCount);
    console.log("Selection Start Time (sec):", selectionStartTime);
    console.log("Metadata Payload:", meta);
    if (meta.chord_item) {
      console.log("--- Chord Progression Details ---");
      console.table(meta.chord_item.map((chord, i) => ({
        index: i,
        chord: chord,
        offset_time: meta.chord_times[i].toFixed(3) + "s"
      })));
    }
    console.log("Form Data - MIDI present:", !!midiBlob);
    console.groupEnd();

    console.log('Sending Generation Request with Meta:', meta);

    const metaBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });

    const formData = new FormData();
    if (modelType !== 'foundation') {
      if (midiBlob && !rules.send_context_condition) {
        formData.append('conditions_midi', midiBlob, 'input.mid');
      }
    }
    formData.append('meta_json', metaBlob, 'meta.json');



    // Context Sending Logic
    if (isSft) {
      if (sendPast && originalMidi) {
        const pastStartTime = hasSelection
          ? Math.max(0, selectionStartTime - 8 * secondsPerMeasure)
          : 0;
        const pastEndTime = hasSelection
          ? selectionStartTime
          : originalMidi.duration;

        const pastMidi = new Midi();
        pastMidi.header.setTempo(bpm);
        let pastNotesAdded = false;

        originalMidi.tracks.forEach(track => {
          const trackNotes = (track.notes || []).filter(note => {
            return note.time >= pastStartTime && note.time < pastEndTime;
          });
          if (trackNotes.length > 0) {
            const newTrack = pastMidi.addTrack();
            newTrack.instrument.number = track.instrument.number;
            newTrack.name = track.name;
            trackNotes.forEach(note => {
              newTrack.addNote({
                midi: note.midi,
                time: Math.max(0, note.time - pastStartTime),
                duration: note.duration,
                velocity: note.velocity
              });
            });
            pastNotesAdded = true;
          }
        });

        if (pastNotesAdded) {
          const pastBlob = new Blob([pastMidi.toArray()], { type: 'audio/midi' });
          formData.append('past_midi', pastBlob, 'past.mid');
        }
      }

      if (sendCondition && originalMidi) {
        const condStartTime = effectiveRange ? effectiveRange[0] * secondsPerMeasure : 0;
        const condEndTime = effectiveRange ? (effectiveRange[1] + 1) * secondsPerMeasure : 0;

        const conditionMidi = new Midi();
        conditionMidi.header.setTempo(bpm);
        let conditionNotesAdded = false;

        originalMidi.tracks.forEach(track => {
          const trackNotes = (track.notes || []).filter(note => {
            return note.time >= condStartTime && note.time < condEndTime;
          });
          if (trackNotes.length > 0) {
            const newTrack = conditionMidi.addTrack();
            newTrack.instrument.number = track.instrument.number;
            newTrack.name = track.name;
            trackNotes.forEach(note => {
              newTrack.addNote({
                midi: note.midi,
                time: Math.max(0, note.time - condStartTime),
                duration: note.duration,
                velocity: note.velocity
              });
            });
            conditionNotesAdded = true;
          }
        });

        if (conditionNotesAdded) {
          const conditionBlob = new Blob([conditionMidi.toArray()], { type: 'audio/midi' });
          formData.append('conditions_midi', conditionBlob, 'conditions.mid');
        }
      }

      if (sendFuture && originalMidi) {
        const selectionEndTime = effectiveRange ? (effectiveRange[1] + 1) * secondsPerMeasure : 0;
        const futureEndTime = selectionEndTime + 8 * secondsPerMeasure;

        const futureMidi = new Midi();
        futureMidi.header.setTempo(bpm);
        let futureNotesAdded = false;

        originalMidi.tracks.forEach(track => {
          const trackNotes = (track.notes || []).filter(note => {
            return note.time >= selectionEndTime && note.time < futureEndTime;
          });
          if (trackNotes.length > 0) {
            const newTrack = futureMidi.addTrack();
            newTrack.instrument.number = track.instrument.number;
            newTrack.name = track.name;
            trackNotes.forEach(note => {
              newTrack.addNote({
                midi: note.midi,
                time: Math.max(0, note.time - selectionEndTime),
                duration: note.duration,
                velocity: note.velocity
              });
            });
            futureNotesAdded = true;
          }
        });

        if (futureNotesAdded) {
          const futureBlob = new Blob([futureMidi.toArray()], { type: 'audio/midi' });
          formData.append('future_midi', futureBlob, 'future.mid');
        }
      }
    } else if (modelType !== 'foundation') {
      if (rules.send_context_past) {
        let pastNotes = [];
        let pastStartTime = 0;

        if (hasSelection) {
          pastNotes = pianoRollRef.current?.getPastNotes(8) || [];
          pastStartTime = Math.max(0, selectionStartTime - 8 * secondsPerMeasure);
        } else if (originalMidi) {
          pastNotes = originalMidi.tracks.flatMap(t => t.notes || []);
          pastStartTime = 0;
        }

        if (pastNotes.length > 0) {
          const pastMidi = new Midi();
          pastMidi.header.setTempo(bpm);
          const pastTrack = pastMidi.addTrack();
          pastTrack.instrument.number = getProgramFromInstrument(primaryInstrument);
          pastNotes.forEach(note => {
            pastTrack.addNote({
              midi: note.midi,
              time: Math.max(0, note.time - pastStartTime),
              duration: note.duration,
              velocity: note.velocity
            });
          });
          const pastBlob = new Blob([pastMidi.toArray()], { type: 'audio/midi' });
          formData.append('past_midi', pastBlob, 'past.mid');
        }
      }

      if (rules.send_context_condition) {
        if (notes.length > 0) {
          const conditionMidi = new Midi();
          conditionMidi.header.setTempo(bpm);
          const conditionTrack = conditionMidi.addTrack();
          conditionTrack.instrument.number = getProgramFromInstrument(primaryInstrument);
          notes.forEach(note => {
            conditionTrack.addNote({
              midi: note.midi,
              time: Math.max(0, note.time - selectionStartTime),
              duration: note.duration,
              velocity: note.velocity
            });
          });
          const conditionBlob = new Blob([conditionMidi.toArray()], { type: 'audio/midi' });
          formData.append('conditions_midi', conditionBlob, 'conditions.mid');
        }
      }

      if (rules.send_context_future) {
        const futureNotes = pianoRollRef.current?.getFutureNotes(8) || [];
        if (futureNotes.length > 0) {
          const futureMidi = new Midi();
          futureMidi.header.setTempo(bpm);
          const futureTrack = futureMidi.addTrack();
          futureTrack.instrument.number = getProgramFromInstrument(primaryInstrument);
          futureNotes.forEach(note => {
            futureTrack.addNote({ midi: note.midi, time: note.time, duration: note.duration, velocity: note.velocity });
          });
          const futureBlob = new Blob([futureMidi.toArray()], { type: 'audio/midi' });
          formData.append('future_midi', futureBlob, 'future.mid');
        }
      }
    }

    try {
      console.log("=== [STEP 3] Dispatching /generate POST request ===");
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': '1'
        }
      });
      console.log("=== [STEP 4] /generate API response received ===", { status: response.status, statusText: response.statusText });

      if (response.ok) {
        if (isSft) {
          console.log("SFT lock active, setting setSftLocked(true).");
          setSftLocked(true);
        }
        const reasonHeader = response.headers.get("X-Generation-Reason");
        if (reasonHeader) {
          try {
            const decoded = JSON.parse(decodeURIComponent(reasonHeader));
            console.log("X-Generation-Reason decoded:", decoded);
            setGenerationReasons(decoded);
          } catch (e) {
            console.error("Failed to parse X-Generation-Reason", e);
          }
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/zip")) {
          const blob = await response.blob();

          // Verify ZIP magic bytes 'PK' (0x50, 0x4B) to prevent JSZip from scanning/hanging on invalid data
          const zipHeaderBuffer = await blob.slice(0, 4).arrayBuffer();
          const zipHeader = new Uint8Array(zipHeaderBuffer);
          const isZip = zipHeader[0] === 0x50 && zipHeader[1] === 0x4B;
          if (!isZip) {
            throw new Error("Invalid ZIP file received (missing PK signature). The response may be corrupted or an error message.");
          }

          const zip = await JSZip.loadAsync(blob);
          const midiPromises = [];
          const jsonPromises = [];

          zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.name.endsWith('.mid')) {
              midiPromises.push(zipEntry.async('arraybuffer').then(buffer => {
                // Verify MIDI magic bytes 'MThd' (0x4D, 0x54, 0x68, 0x64) before parsing
                const midiHeader = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
                const isMidi = midiHeader[0] === 0x4D && 
                               midiHeader[1] === 0x54 && 
                               midiHeader[2] === 0x68 && 
                               midiHeader[3] === 0x64;
                if (!isMidi) {
                  throw new Error(`Invalid MIDI file inside zip: ${zipEntry.name} (missing MThd signature).`);
                }
                return new Midi(buffer);
              }));
            } else if (zipEntry.name.endsWith('.json')) {
              jsonPromises.push(zipEntry.async('string'));
            }
          });

          console.log("=== [STEP 5] Parsing response as ZIP ===");
          const loadedMidis = await Promise.all(midiPromises);
          const loadedJsons = await Promise.all(jsonPromises);
          console.log("ZIP contents successfully parsed:", { midisCount: loadedMidis.length, jsonsCount: loadedJsons.length });

          if (loadedJsons.length > 0) {
            setNotification({ open: true, message: loadedJsons.join('\n'), severity: 'info' });
          } else if (loadedMidis.length > 0) {
            setGeneratedMidis(loadedMidis);
            setSelectedGeneratedMidi(0);
            setNotification({ open: true, message: `Successfully generated ${loadedMidis.length} MIDI file(s).`, severity: 'success' });
          } else {
            setNotification({ open: true, message: 'Generation complete, but no relevant files were produced.', severity: 'warning' });
          }
        } else if (contentType && (contentType.includes("audio/midi") || contentType.includes("application/x-midi"))) {
          console.log("=== [STEP 5] Parsing response as single MIDI file ===");
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();

          // Verify MIDI magic bytes 'MThd' (0x4D, 0x54, 0x68, 0x64) before parsing
          const midiHeader = new Uint8Array(arrayBuffer, 0, Math.min(4, arrayBuffer.byteLength));
          const isMidi = midiHeader[0] === 0x4D && 
                         midiHeader[1] === 0x54 && 
                         midiHeader[2] === 0x68 && 
                         midiHeader[3] === 0x64;
          if (!isMidi) {
            throw new Error("Invalid MIDI file received (missing MThd signature).");
          }

          const midi = new Midi(arrayBuffer);
          console.log("Parsed MIDI object:", { tracksCount: midi.tracks.length, duration: midi.duration });
          setGeneratedMidis([midi]);
          setSelectedGeneratedMidi(0);
          setNotification({ open: true, message: `Successfully generated MIDI file.`, severity: 'success' });
        } else {
          // Fallback for unknown content type, try to parse as MIDI if possible or error
          try {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            // Verify MIDI magic bytes 'MThd' (0x4D, 0x54, 0x68, 0x64) before parsing
            const midiHeader = new Uint8Array(arrayBuffer, 0, Math.min(4, arrayBuffer.byteLength));
            const isMidi = midiHeader[0] === 0x4D && 
                           midiHeader[1] === 0x54 && 
                           midiHeader[2] === 0x68 && 
                           midiHeader[3] === 0x64;
            if (!isMidi) {
              throw new Error("Invalid MIDI file signature (missing MThd).");
            }

            const midi = new Midi(arrayBuffer);
            setGeneratedMidis([midi]);
            setSelectedGeneratedMidi(0);
            setNotification({ open: true, message: `Successfully generated MIDI file (fallback).`, severity: 'success' });
          } catch (e) {
            setNotification({ open: true, message: `Unknown or invalid response format: ${contentType || 'unknown'}. Parsing failed: ${e.message}`, severity: 'error' });
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Generation failed response:', errorText);
        let errorMessage = errorText;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'object'
              ? JSON.stringify(errorData.detail, null, 2)
              : errorData.detail;
          }
        } catch (e) {
          // Not JSON
        }
        setNotification({ open: true, message: `Generation failed: ${errorMessage || response.statusText}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error during generation:', error);
      setNotification({ open: true, message: `An error occurred: ${error.message}`, severity: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const modelObject = modelInfo.find(model => model.model_name === selectedModel);
    const modelType = modelObject?.tag?.model;

    const generatedMidi = generatedMidis[selectedGeneratedMidi];

    console.log("=== [MERGE EFFECT TRIGGERED] ===", {
      modelType,
      hasGeneratedMidi: !!generatedMidi,
      tracksCount: generatedMidi?.tracks?.length,
      hasOriginalMidi: !!originalMidi,
      generationRange,
      lastTask
    });

    if (!modelType || !generatedMidi || !generatedMidi.tracks) {
      console.log("Merge effect early return: Missing required data.");
      return;
    }

    try {
      if (modelType === 'foundation' || !originalMidi || (modelType === 'pretrained' && lastTask !== 'Chord2MIDI')) {
        console.log("Executing Branch 1: Set directly to generatedMidi.");
        setMidiData(generatedMidi);
      } else if (generationRange && (lastTask === 'Chord2MIDI' || originalMidi)) {
        console.log("Executing Branch 2: Range-based / Chord2MIDI merge.", { generationRange });
        // Merge logic for Chord2MIDI or Range-based generation
        const targetTrackIndex = pianoRollRef.current?.getSelectedTrackIndex() || 0;
        const rawBpm = originalMidi?.header.tempos[0]?.bpm || tempo || 120;
        const bpm = rawBpm > 0 ? rawBpm : 120;
        const timeSignature = originalMidi?.header.timeSignatures[0]?.timeSignature || [4, 4];
        const secondsPerMeasure = (60 / bpm) * timeSignature[0];

        // Determine shift time (e.g. 1 measure shift for SFT models)
        const ruleShiftMeasure = modelObject?.rule?.shift_measure;
        const shiftMeasures = typeof ruleShiftMeasure === 'number' ? ruleShiftMeasure : (isSft ? 1 : 0);
        const shiftTime = shiftMeasures * secondsPerMeasure;

        const selectionStartTime = generationRange[0] * secondsPerMeasure;
        const selectionEndTime = (generationRange[1] + 1) * secondsPerMeasure;

        // Smart Offset Decision
        const allReceivedNotes = generatedMidi.tracks
          .flatMap(t => t.notes || [])
          .filter(note => typeof note.time === 'number' && !isNaN(note.time) && isFinite(note.time))
          .sort((a, b) => a.time - b.time);
        const firstNoteTime = allReceivedNotes.length > 0 ? allReceivedNotes[0].time : 0;

        // For range-based generation, the model might output a default silence (e.g. 1 measure).
        // We subtract shiftTime to align the actual musical notes exactly with the user's selectionStartTime.
        const needsOffset = firstNoteTime < (selectionStartTime - 0.1);
        const offsetToApply = needsOffset ? (selectionStartTime - shiftTime) : -shiftTime;

        console.group("🔍 MIDI Merge Debug Information");
        console.log("Selection Start Time (sec):", selectionStartTime.toFixed(3) + "s");
        console.log("Model-specific Shift Time (sec):", shiftTime.toFixed(3) + "s (" + shiftMeasures + " measure(s))");
        console.log("First Received Note Time (Raw):", firstNoteTime.toFixed(3) + "s");
        console.log("Offset being applied:", offsetToApply.toFixed(3) + "s");
        console.groupEnd();

        const newMidi = new Midi();
        if (originalMidi && originalMidi.header) {
          // 'ppq' is a read-only getter, so we modify the backing private field '_ppq' directly
          newMidi.header._ppq = originalMidi.header.ppq;
          if (originalMidi.header.tempos[0]) {
            newMidi.header.setTempo(originalMidi.header.tempos[0].bpm);
            newMidi.header.name = originalMidi.header.name;
          }
        } else {
          newMidi.header.setTempo(bpm);
        }

        const tracksToProcess = originalMidi ? originalMidi.tracks : [null];

        tracksToProcess.forEach((track, index) => {
          const newTrack = newMidi.addTrack();
          if (track) {
            newTrack.instrument.number = track.instrument.number;
            newTrack.name = track.name;
          }

          if (index === targetTrackIndex) {
            // 1. Add notes BEFORE selection from original
            if (track && track.notes) {
              track.notes.forEach(note => {
                if (note.time < selectionStartTime) {
                  newTrack.addNote({
                    midi: note.midi,
                    time: note.time,
                    duration: note.duration,
                    velocity: note.velocity
                  });
                }
              });
            }

            // 2. Add GENERATED notes
            generatedMidi.tracks.forEach(genTrack => {
              if (genTrack.notes) {
                genTrack.notes.forEach(note => {
                  newTrack.addNote({
                    midi: note.midi,
                    time: note.time + offsetToApply,
                    duration: note.duration,
                    velocity: note.velocity
                  });
                });
              }
            });

            // 3. Add notes AFTER selection from original
            if (track && track.notes) {
              track.notes.forEach(note => {
                if (note.time >= selectionEndTime) {
                  newTrack.addNote({
                    midi: note.midi,
                    time: note.time,
                    duration: note.duration,
                    velocity: note.velocity
                  });
                }
              });
            }
          } else if (track) {
            // Just copy other tracks
            if (track.notes) {
              track.notes.forEach(note => {
                newTrack.addNote({
                  midi: note.midi,
                  time: note.time,
                  duration: note.duration,
                  velocity: note.velocity
                });
              });
            }
          }
        });
        console.log("Setting midiData from Branch 2.");
        setMidiData(newMidi);
      } else if (modelObject?.rule?.use_chord || modelObject?.rule?.send_chord || modelType === 'sft_gen' || modelType === 'sft') {
        console.log("Executing Branch 3: Append-based merge (SFT/Chord).");
        const newMidi = new Midi();
        if (originalMidi && originalMidi.header) {
          // 'ppq' is a read-only getter, so we modify the backing private field '_ppq' directly
          newMidi.header._ppq = originalMidi.header.ppq;
          if (originalMidi.header.tempos[0]) {
            newMidi.header.setTempo(originalMidi.header.tempos[0].bpm);
            newMidi.header.name = originalMidi.header.name;
          }
        }

        const rawBpm = originalMidi?.header.tempos[0]?.bpm || tempo || 120;
        const bpm = rawBpm > 0 ? rawBpm : 120;
        const timeSignature = originalMidi?.header.timeSignatures[0]?.timeSignature || [4, 4];
        const secondsPerMeasure = (60 / bpm) * timeSignature[0];

        // 1. Calculate actual prompt end time based on the last note's end time (aligned to measure boundary)
        let promptEndTime = 0;
        if (originalMidi && originalMidi.tracks) {
          const allOriginalNotes = originalMidi.tracks.flatMap(t => t.notes || []);
          if (allOriginalNotes.length > 0) {
            const lastNoteTime = allOriginalNotes.reduce((max, note) => Math.max(max, note.time + note.duration), 0);
            const lastMeasure = Math.ceil(lastNoteTime / secondsPerMeasure);
            promptEndTime = lastMeasure * secondsPerMeasure;
          } else {
            promptEndTime = originalMidi.duration;
          }
        } else {
          promptEndTime = originalMidi ? originalMidi.duration : 0;
        }

        // 2. Smart Shift Decision: Check if the generated MIDI already has a leading silence/offset
        const genNotes = generatedMidi.tracks.flatMap(t => t.notes || []).sort((a, b) => a.time - b.time);
        const firstGenNoteTime = genNotes.length > 0 ? genNotes[0].time : 0;

        const ruleShiftMeasure = modelObject?.rule?.shift_measure;
        const targetShiftMeasures = typeof ruleShiftMeasure === 'number' ? ruleShiftMeasure : (isSft ? 1 : 0);

        // If the generated MIDI already starts after targetShiftMeasures (e.g. API generated it with a 1-measure blank space),
        // we set shiftTime to targetShiftMeasures to subtract/cut it on the client side.
        const alreadyHasShift = firstGenNoteTime >= (targetShiftMeasures * secondsPerMeasure - 0.1);
        const shiftTime = alreadyHasShift ? (targetShiftMeasures * secondsPerMeasure) : 0;

        console.log("=== Branch 3 Smart Merge Parameters (Silence Cut Active) ===", {
          promptEndTime,
          lastNoteTimeAligned: (promptEndTime / secondsPerMeasure) + " measures",
          firstGenNoteTime: firstGenNoteTime.toFixed(3) + "s",
          alreadyHasShift,
          cutShiftTime: shiftTime.toFixed(3) + "s",
          targetPosition: promptEndTime + (alreadyHasShift ? 0 : (targetShiftMeasures * secondsPerMeasure))
        });

        const targetTrackIndex = pianoRollRef.current?.getSelectedTrackIndex() || 0;

        if (originalMidi && originalMidi.tracks) {
          originalMidi.tracks.forEach((originalTrack, index) => {
            const newTrack = newMidi.addTrack();
            newTrack.instrument.number = originalTrack.instrument.number;
            newTrack.name = originalTrack.name;

            // 1. Copy notes before promptEndTime
            if (originalTrack.notes) {
              originalTrack.notes.forEach(note => {
                if (note.time < promptEndTime) {
                  newTrack.addNote({
                    midi: note.midi,
                    time: note.time,
                    duration: note.duration,
                    velocity: note.velocity
                  });
                }
              });
            }

            // 2. Append generated notes to target track, subtracting shiftTime to cut the leading silence
            if (index === targetTrackIndex && generatedMidi && generatedMidi.tracks) {
              generatedMidi.tracks.forEach(generatedTrack => {
                if (generatedTrack.notes) {
                  generatedTrack.notes.forEach(note => {
                    const finalTime = note.time + promptEndTime - shiftTime;
                    newTrack.addNote({
                      midi: note.midi,
                      time: Math.max(promptEndTime, finalTime),
                      duration: note.duration,
                      velocity: note.velocity
                    });
                  });
                }
              });
            }
          });
        } else {
          // Fallback: If no originalMidi tracks, just copy generatedMidi tracks
          if (generatedMidi && generatedMidi.tracks) {
            generatedMidi.tracks.forEach(generatedTrack => {
              const newTrack = newMidi.addTrack();
              newTrack.instrument.number = generatedTrack.instrument.number;
              newTrack.name = generatedTrack.name;
              if (generatedTrack.notes) {
                generatedTrack.notes.forEach(note => {
                  newTrack.addNote({
                    midi: note.midi,
                    time: note.time,
                    duration: note.duration,
                    velocity: note.velocity
                  });
                });
              }
            });
          }
        }
        setMidiData(newMidi);
      } else {
        console.log("Merge effect: No matching merge branch. Fallback: No action taken.");
      }
    } catch (error) {
      console.error("Error during MIDI merge rendering:", error);
      setNotification({ open: true, message: `Render/Merge failed: ${error.message}`, severity: 'error' });
      setIsGenerating(false);
    }
  }, [generatedMidis, selectedGeneratedMidi, originalMidi, modelInfo, selectedModel, trackMutes, generationRange]);


  useEffect(() => {
    if (playbackState === 'playing') {
      const id = Tone.Transport.scheduleRepeat(time => {
        Tone.Draw.schedule(() => setProgress(Tone.Transport.progress), time);
      }, '16n');
      return () => Tone.Transport.clear(id);
    }
  }, [playbackState]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (playbackState === 'playing') handlePause();
        else handlePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState, handlePlay, handlePause]);

  const toggleMute = (trackIndex) => {
    setTrackMutes(prev => ({
      ...prev,
      [trackIndex]: !prev[trackIndex]
    }));
  };

  const toggleSolo = (trackIndex) => {
    setTrackSolos(prev => ({
      ...prev,
      [trackIndex]: !prev[trackIndex]
    }));
  };

  const deleteTrack = (trackIndex) => {
    if (!midiData) return;
    const newMidiData = new Midi(midiData.toArray());
    newMidiData.tracks.splice(trackIndex, 1);
    setMidiData(newMidiData);
    // Also update mutes to shift or remove
    setTrackMutes(prev => {
      const newMutes = {};
      Object.keys(prev).forEach(key => {
        const k = parseInt(key);
        if (k < trackIndex) newMutes[k] = prev[k];
        else if (k > trackIndex) newMutes[k - 1] = prev[k];
      });
      return newMutes;
    });
  };

  const clearAllTracks = () => {
    setMidiData(null);
    setOriginalMidi(null);
    setGeneratedMidis([]);
    setGenerationRange(null);
    setInstruments([]);
    setTrackMutes({});
    setTrackSolos({});
    setChords({});
    handleStop();
    setSftLocked(false);
    setCustomKey(null);
    setCustomDensities(null);
  };

  const handleGenerateMetadataOnly = async (overrides) => {
    setShowSftMetadataModal(false);
    await handleGenerate(overrides);
  };

  const handleSaveIncrementalConfig = (config) => {
    setCustomKey(config.customKey);
    setCustomDensities(config.customDensities);
    setCustomTask(config.customTask);
  };

  const duration = midiData ? midiData.duration : 0;

  return (
    <div className="h-screen bg-background text-text flex flex-col overflow-hidden">
      {/* Service Unavailable Modal */}
      {showServiceUnavailableModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="bg-surface p-8 border border-border rounded-xl text-center max-w-lg mx-4 shadow-2xl animate-in fade-in zoom-in duration-300">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">サービス停止中</h2>
            <p className="text-muted text-lg leading-relaxed whitespace-pre-line">
              申し訳ありません、現在サーバー上で機械学習を行っているため、
              デモを実行できません。
            </p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification.open && (
        <div className={`fixed top-4 right-4 z-[300] p-4 rounded-lg shadow-lg border flex items-start gap-3 max-w-md animate-in slide-in-from-right-5 fade-in duration-300 ${notification.severity === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
          notification.severity === 'warning' ? 'bg-yellow-900/90 border-yellow-700 text-yellow-100' :
            notification.severity === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
              'bg-blue-900/90 border-blue-700 text-blue-100'
          }`}>
          {notification.severity === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {notification.severity === 'warning' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {notification.severity === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {notification.severity === 'info' && <Info className="w-5 h-5 shrink-0" />}
          <div className="flex-1 text-sm whitespace-pre-wrap break-all">{notification.message}</div>
          <button
            onClick={() => setNotification({ ...notification, open: false })}
            className="text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <Header />

      <main className="flex-1 flex overflow-hidden">
        <Sidebar activeMode={activeMode} setActiveMode={setActiveMode} />

        <div className="flex-1 overflow-hidden relative">
          {activeMode === 'DEMO' ? (
            <div className="h-full overflow-hidden container mx-auto px-4 pb-4 max-w-[1600px] flex flex-col">
              {!samplerLoaded ? (
                <div className="flex flex-col justify-center items-center h-full gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-xl text-muted">Loading Samples...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden pt-4">
                  <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 pb-2 h-full">
                    {/* Added h-full to container for independent scrolling if needed, checking layout */}
                    <div className="card space-y-6">

                      {!sftLocked && (
                        <Settings
                          instrument={instrument}
                          setInstrument={setInstrument}
                          tempo={tempo}
                          setTempo={setTempo}
                          selectedModel={selectedModel}
                          setSelectedModel={setSelectedModel}
                          modelInfo={modelInfo}
                          debugMode={debugMode}
                          keySelection={key}
                          setKey={setKey}
                          selectedInstruments={selectedInstruments}
                          setSelectedInstruments={setSelectedInstruments}
                          densities={densities}
                          setDensities={setDensities}
                          selectedTask={selectedTask}
                          selectedGenres={selectedGenres}
                          setSelectedGenres={setSelectedGenres}
                          sftLocked={sftLocked}
                          thinking={thinking}
                          setThinking={setThinking}
                        />
                      )}
                      <AdvancedSettings
                        temperature={temperature}
                        setTemperature={setTemperature}
                        p={p}
                        setP={setP}
                        numGems={numGems}
                        setNumGems={setNumGems}
                        rules={modelInfo.find(m => m.model_name === selectedModel)?.rule}
                        thinking={thinking}
                        setThinking={setThinking}
                        isSft={isSft}
                        cotTemperature={cotTemperature}
                        setCotTemperature={setCotTemperature}
                      />
                    </div>

                    <div className="card">
                      <Controls
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onStop={handleStop}
                        onGenerate={handleGenerate}
                        isGenerating={isGenerating}
                        playbackState={playbackState}
                        progress={progress}
                        duration={duration}
                        generatedMidis={generatedMidis}
                        selectedGeneratedMidi={selectedGeneratedMidi}
                        onSelectedGeneratedMidiChange={setSelectedGeneratedMidi}
                        isSft={isSft}
                        onGearClick={() => setShowSftIncrementalConfigModal(true)}
                      />
                    </div>

                    {/* AI Reasoning (CoT) Panel */}
                    {generationReasons && generationReasons[selectedGeneratedMidi] && (
                      <div className="card space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <h6 className="text-sm font-bold tracking-wide text-text flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            AI Reason / CoT
                          </h6>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            generationReasons[selectedGeneratedMidi].source === 'model_cot'
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-muted/10 text-muted border border-border'
                          }`}>
                            {generationReasons[selectedGeneratedMidi].source === 'model_cot' ? '💡 CoT (Model)' : '⚙️ Request'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {generationReasons[selectedGeneratedMidi].key && (
                            <div className="p-2 bg-surface/30 border border-border/50 rounded-lg flex flex-col">
                              <span className="text-[9px] text-muted uppercase font-mono">Key</span>
                              <span className="font-bold text-text mt-0.5">{generationReasons[selectedGeneratedMidi].key}</span>
                            </div>
                          )}
                          {generationReasons[selectedGeneratedMidi].gen_measure_count && (
                            <div className="p-2 bg-surface/30 border border-border/50 rounded-lg flex flex-col">
                              <span className="text-[9px] text-muted uppercase font-mono">Measures</span>
                              <span className="font-bold text-text mt-0.5">{generationReasons[selectedGeneratedMidi].gen_measure_count} bars</span>
                            </div>
                          )}
                          {generationReasons[selectedGeneratedMidi].genre && generationReasons[selectedGeneratedMidi].genre.length > 0 && (
                            <div className="p-2 bg-surface/30 border border-border/50 rounded-lg flex flex-col col-span-2">
                              <span className="text-[9px] text-muted uppercase font-mono">Genre</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {generationReasons[selectedGeneratedMidi].genre.map(g => (
                                  <span key={g} className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded font-mono text-[9px] font-bold">
                                    {g}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {generationReasons[selectedGeneratedMidi].instruments && (
                            <div className="p-2 bg-surface/30 border border-border/50 rounded-lg flex flex-col col-span-2">
                              <span className="text-[9px] text-muted uppercase font-mono">Instruments</span>
                              <span className="font-medium text-text mt-0.5 font-mono">{generationReasons[selectedGeneratedMidi].instruments.join(', ')}</span>
                            </div>
                          )}
                          {generationReasons[selectedGeneratedMidi].note_density && Object.keys(generationReasons[selectedGeneratedMidi].note_density).length > 0 && (
                            <div className="p-2 bg-surface/30 border border-border/50 rounded-lg flex flex-col col-span-2">
                              <span className="text-[9px] text-muted uppercase font-mono">Note Density</span>
                              <div className="space-y-1 mt-1 font-mono text-[9px]">
                                {Object.entries(generationReasons[selectedGeneratedMidi].note_density).map(([inst, val]) => (
                                  <div key={inst} className="flex justify-between">
                                    <span className="text-muted">{inst}:</span>
                                    <span className="font-bold text-primary">{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {generationReasons[selectedGeneratedMidi].task && (
                            <div className="p-2 bg-surface/30 border border-border/50 rounded-lg flex flex-col col-span-2">
                              <span className="text-[9px] text-muted uppercase font-mono">Internal Task</span>
                              <span className="font-medium text-text mt-0.5 font-mono">{generationReasons[selectedGeneratedMidi].task}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {debugMode && debugInfo && (
                      <div className="p-4 border border-dashed border-border bg-surface/30 rounded-lg">
                        <h6 className="text-lg font-semibold mb-2">Debug Information</h6>
                        <pre className="whitespace-pre-wrap break-all text-xs font-mono text-muted">
                          {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-8 h-full flex flex-col min-h-[400px]">
                    <div className="card h-full flex flex-col p-0 overflow-hidden">
                      {midiData ? (
                        <PianoRoll
                          ref={pianoRollRef}
                          midiData={midiData}
                          progress={progress}
                          duration={duration}
                          generationLength={generationLength}
                          setGenerationLength={setGenerationLength}
                          onSeek={handleSeek}
                          onChordsChange={setChords}
                          onMute={toggleMute}
                          onSolo={toggleSolo}
                          onDelete={deleteTrack}
                          onClear={clearAllTracks}
                          trackMutes={trackMutes}
                          trackSolos={trackSolos}
                          selectionEnabled={modelInfo.find(m => m.model_name === selectedModel)?.rule?.gen_measure_count === true}
                          useChord={modelInfo.find(m => m.model_name === selectedModel)?.rule?.use_chord === true || modelInfo.find(m => m.model_name === selectedModel)?.rule?.send_chord === true}
                          chords={chords}
                        />
                      ) : (
                        <div className="h-full p-6">
                          {(() => {
                            const currentModel = modelInfo.find(m => m.model_name === selectedModel);
                            const inputMidiAllowed = currentModel?.rule?.input_midi !== false;
                            const selectionEnabled = currentModel?.rule?.gen_measure_count === true;

                            if (inputMidiAllowed) {
                              return (
                                <MidiInput
                                  onMidiUpload={handleMidiUpload}
                                  isSft={isSft}
                                  onGenerateClick={() => setShowSftMetadataModal(true)}
                                />
                              );
                            } else {
                              // Create a default empty MIDI object for display
                              const emptyMidi = new Midi();
                              // Add a dummy track so PianoRoll doesn't crash or look broken
                              emptyMidi.addTrack();
                              // We need to set this as midiData to trigger the PianoRoll render
                              // But we can't do it inside render. 
                              // Instead, we'll render a placeholder or trigger an effect.
                              // Better approach: If input_midi is false, we should probably auto-initialize midiData 
                              // or just render the PianoRoll with a dummy object directly here without setting state if we don't want to persist it yet.
                              // However, PianoRoll expects midiData prop.
                              // Let's use a temporary empty midi object just for rendering if we want to show "empty piano roll".

                              // Actually, the requirement says: "Inputフォームの代わりに空のピアノロールを表示してください。"
                              // If I just render PianoRoll here with empty data, it might work.

                              // Let's create a memoized empty midi to avoid recreation
                              const dummyMidi = new Midi();
                              dummyMidi.header.fromJSON({
                                name: "",
                                ppq: 480,
                                meta: [],
                                tempos: [{ bpm: tempo || 120, ticks: 0 }],
                                timeSignatures: [{ timeSignature: [4, 4], ticks: 0 }],
                                keySignatures: []
                              });
                              const track = dummyMidi.addTrack();
                              // Add C4 quarter note to make it not completely empty if needed, or just leave empty.

                              return (
                                <PianoRoll
                                  ref={pianoRollRef}
                                  midiData={dummyMidi}
                                  progress={progress}
                                  duration={duration}
                                  generationLength={generationLength}
                                  setGenerationLength={setGenerationLength}
                                  onSeek={handleSeek}
                                  onChordsChange={setChords}
                                  onMute={toggleMute}
                                  onSolo={toggleSolo}
                                  onDelete={deleteTrack}
                                  onClear={clearAllTracks}
                                  trackMutes={trackMutes}
                                  trackSolos={trackSolos}
                                  selectionEnabled={selectionEnabled}
                                  useChord={currentModel?.rule?.use_chord === true || currentModel?.rule?.send_chord === true}
                                  chords={chords}
                                />
                              );
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {activeMode === 'VS' && (
                <VSMode
                  modelInfo={modelInfo}
                  midiData={midiData}
                  setMidiData={setMidiData}
                  selectedTask={selectedTask}
                  pianoRollProps={{
                    midiData,
                    setMidiData,
                    isPlaying: playbackState === 'playing',
                    playbackTime: Tone.Transport.seconds,
                    progress,
                    onSeek: handleSeek
                  }}
                  settings={{
                    temperature, setTemperature,
                    p, setP,
                    numGems, setNumGems,
                    cotTemperature, setCotTemperature,
                    thinking, setThinking
                  }}
                  onGenerate={generateMidi}
                  playbackState={playbackState}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onStop={handleStop}
                />
              )}
              {activeMode === 'PODCAST' && (
                <PodcastMode
                  modelInfo={modelInfo}
                  onGenerate={generateMidi}
                  midiData={midiData}
                  setMidiData={setMidiData}
                  settings={{
                    temperature, setTemperature,
                    p, setP,
                    numGems, setNumGems,
                    tempo, setTempo,
                    key, setKey,
                    selectedInstruments, setSelectedInstruments,
                    densities, setDensities,
                    selectedGenres, setSelectedGenres,
                    cotTemperature, setCotTemperature,
                    thinking, setThinking
                  }}
                  playbackState={playbackState}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onStop={handleStop}
                  setNotification={setNotification}
                  onAppendMidi={handleAppendMidi}
                  progress={progress}
                  onSeek={handleSeek}
                />
              )}
            </>
          )}
        </div>
      </main >

      {/* SFT Modal Popups */}
      {(() => {
        const sftModel = modelInfo.find(m => m.tag?.model === 'sft_gen' || m.tag?.model === 'sft');
        const availableSftInstruments = sftModel?.tag?.instruments
          ? (Array.isArray(sftModel.tag.instruments) ? sftModel.tag.instruments : [sftModel.tag.instruments])
          : [];
        
        return (
          <>
            <SftMetadataModal
              isOpen={showSftMetadataModal}
              onClose={() => setShowSftMetadataModal(false)}
              onGenerate={handleGenerateMetadataOnly}
              availableInstruments={availableSftInstruments}
              currentKey={key}
              currentInstruments={selectedInstruments}
              currentDensities={densities}
              currentGenres={selectedGenres}
              sftTask={sftTask}
              setSftTask={setSftTask}
            />
            <SftIncrementalConfigModal
              isOpen={showSftIncrementalConfigModal}
              onClose={() => setShowSftIncrementalConfigModal(false)}
              onSave={handleSaveIncrementalConfig}
              availableInstruments={availableSftInstruments}
              currentCustomKey={customKey}
              currentCustomDensities={customDensities}
              currentCustomTask={customTask}
            />
          </>
        );
      })()}
    </div >
  );
}

function SftMetadataModal({ isOpen, onClose, onGenerate, availableInstruments, currentKey, currentInstruments, currentDensities, currentGenres, sftTask, setSftTask }) {
  const [keySelection, setKeySelection] = useState(currentKey || 'Auto');
  const [selectedInsts, setSelectedInsts] = useState(currentInstruments || []);
  const [localDensities, setLocalDensities] = useState(currentDensities || {});
  const [localGenres, setLocalGenres] = useState(currentGenres || []);
  const [keySelectorOpen, setKeySelectorOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeySelection(currentKey || 'Auto');
      setSelectedInsts(currentInstruments || []);
      setLocalDensities(currentDensities || {});
      setLocalGenres(currentGenres || []);
    }
  }, [isOpen, currentKey, currentInstruments, currentDensities, currentGenres]);

  useEffect(() => {
    const updated = { ...localDensities };
    let changed = false;
    selectedInsts.forEach(inst => {
      if (updated[inst] === undefined) {
        updated[inst] = 4;
        changed = true;
      }
    });
    if (changed) {
      setLocalDensities(updated);
    }
  }, [selectedInsts]);

  if (!isOpen) return null;

  const toggleGenre = (genre) => {
    if (localGenres.includes(genre)) {
      setLocalGenres(localGenres.filter(g => g !== genre));
    } else {
      if (localGenres.length < 2) {
        setLocalGenres([...localGenres, genre]);
      } else {
        setLocalGenres([localGenres[1], genre]);
      }
    }
  };

  const toggleInstrument = (inst) => {
    if (selectedInsts.includes(inst)) {
      setSelectedInsts(selectedInsts.filter(i => i !== inst));
    } else {
      setSelectedInsts([...selectedInsts, inst]);
    }
  };

  const handleDensityChange = (inst, value) => {
    setLocalDensities(prev => ({
      ...prev,
      [inst]: parseInt(value)
    }));
  };

  const handleGenerateClick = () => {
    onGenerate({
      key: keySelection,
      instruments: selectedInsts,
      densities: localDensities,
      genres: localGenres
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/30">
          <h2 className="text-xl font-bold text-white tracking-wide">SFT Generation Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors text-muted hover:text-text text-xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted uppercase tracking-wider">SFT Task</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-surface/20 p-3 rounded-lg border border-border/50">
              {[
                { id: 'auto', label: '🔍 Auto-detect' },
                { id: 'meta', label: '✨ Meta (New)' },
                { id: 'meta_past', label: '➡️ Past (Continue)' },
                { id: 'meta_future', label: '⬅️ Future (Prepend)' },
                { id: 'infill', label: '↕️ Infill (Gap)' },
                { id: 'inst_comp', label: '🎻 Arrangement' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSftTask && setSftTask(t.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                    sftTask === t.id
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'bg-surface border-border text-muted hover:text-text hover:bg-surface/80 hover:border-primary/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted uppercase tracking-wider">Key</label>
            <button
              onClick={() => setKeySelectorOpen(true)}
              className="w-full p-3 bg-surface border border-border rounded-lg text-left hover:bg-surface/80 transition-colors flex items-center justify-between"
            >
              <span className="font-medium text-white">{keySelection}</span>
              <Music className="w-5 h-5 text-muted" />
            </button>
          </div>

          {availableInstruments.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted uppercase tracking-wider">Instruments</label>
              <div className="flex flex-wrap gap-2">
                {availableInstruments.map(inst => {
                  const isSelected = selectedInsts.includes(inst);
                  return (
                    <button
                      key={inst}
                      onClick={() => toggleInstrument(inst)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary text-white shadow-lg shadow-primary/25'
                          : 'bg-surface border border-border text-text hover:bg-surface/80 hover:border-primary/50'
                      }`}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedInsts.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-border">
              <label className="text-sm font-semibold text-muted uppercase tracking-wider">Note Density (1-10)</label>
              <div className="space-y-3">
                {selectedInsts.map(inst => (
                  <div key={inst} className="space-y-1 bg-surface/20 p-3 rounded-lg border border-border/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-mono text-primary font-bold">{inst}</span>
                      <span className="font-mono text-muted">{localDensities[inst] || 4}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={localDensities[inst] || 4}
                      onChange={(e) => handleDensityChange(inst, e.target.value)}
                      className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-muted uppercase tracking-wider">Genres (Select up to 2)</label>
              {localGenres.length > 0 && (
                <button onClick={() => setLocalGenres([])} className="text-xs text-primary hover:underline font-medium">
                  Clear All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-surface/20 rounded-lg border border-border/50 scrollbar-thin">
              {ALL_GENRES.map(genre => {
                const isSelected = localGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary text-white shadow-md shadow-primary/30 scale-95 border border-primary'
                        : 'bg-surface border border-border text-muted hover:text-text hover:bg-surface/80 hover:border-primary/30'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border bg-surface/30 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-2.5 px-5">
            Cancel
          </button>
          <button
            onClick={handleGenerateClick}
            disabled={selectedInsts.length === 0}
            className="btn-primary py-2.5 px-6 font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate
          </button>
        </div>
      </div>

      <KeySelector
        open={keySelectorOpen}
        onClose={() => setKeySelectorOpen(false)}
        onSave={setKeySelection}
        currentKey={keySelection}
      />
    </div>
  );
}

function SftIncrementalConfigModal({ isOpen, onClose, onSave, availableInstruments, currentCustomKey, currentCustomDensities, currentCustomTask }) {
  const [enableKey, setEnableKey] = useState(currentCustomKey !== null);
  const [localKey, setLocalKey] = useState(currentCustomKey || 'C M');
  const [enableDensities, setEnableDensities] = useState(currentCustomDensities !== null);
  const [localDensities, setLocalDensities] = useState(currentCustomDensities || {});
  const [enableTask, setEnableTask] = useState(currentCustomTask !== null);
  const [localTask, setLocalTask] = useState(currentCustomTask || 'auto');
  const [keySelectorOpen, setKeySelectorOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEnableKey(currentCustomKey !== null);
      setLocalKey(currentCustomKey || 'C M');
      setEnableDensities(currentCustomDensities !== null);
      setLocalDensities(currentCustomDensities || {});
      setEnableTask(currentCustomTask !== null);
      setLocalTask(currentCustomTask || 'auto');
    }
  }, [isOpen, currentCustomKey, currentCustomDensities, currentCustomTask]);

  useEffect(() => {
    if (enableDensities) {
      const updated = { ...localDensities };
      let changed = false;
      availableInstruments.forEach(inst => {
        if (updated[inst] === undefined) {
          updated[inst] = 4;
          changed = true;
        }
      });
      if (changed) {
        setLocalDensities(updated);
      }
    }
  }, [enableDensities, availableInstruments]);

  if (!isOpen) return null;

  const handleDensityChange = (inst, value) => {
    setLocalDensities(prev => ({
      ...prev,
      [inst]: parseInt(value)
    }));
  };

  const handleSave = () => {
    onSave({
      customKey: enableKey ? localKey : null,
      customDensities: enableDensities ? localDensities : null,
      customTask: enableTask ? localTask : null
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/30">
          <h2 className="text-lg font-bold text-white tracking-wide">Incremental Generation Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors text-muted hover:text-text text-xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="enable-key-override"
                checked={enableKey}
                onChange={(e) => setEnableKey(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary accent-primary bg-surface"
              />
              <label htmlFor="enable-key-override" className="text-sm font-semibold text-text select-none cursor-pointer">
                Override Key for Generation
              </label>
            </div>
            
            {enableKey && (
              <button
                onClick={() => setKeySelectorOpen(true)}
                className="w-full p-2.5 bg-surface border border-border rounded-lg text-left hover:bg-surface/80 transition-all flex items-center justify-between animate-in slide-in-from-top-2 duration-200"
              >
                <span className="font-medium text-white">{localKey}</span>
                <Music className="w-4 h-4 text-muted" />
              </button>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="enable-density-override"
                checked={enableDensities}
                onChange={(e) => setEnableDensities(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary accent-primary bg-surface"
              />
              <label htmlFor="enable-density-override" className="text-sm font-semibold text-text select-none cursor-pointer">
                Override Note Density for Generation
              </label>
            </div>

            {enableDensities && availableInstruments.length > 0 && (
              <div className="space-y-3 mt-2 animate-in slide-in-from-top-2 duration-200">
                {availableInstruments.map(inst => (
                  <div key={inst} className="space-y-1 bg-surface/20 p-2.5 rounded-lg border border-border/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-primary font-bold">{inst}</span>
                      <span className="font-mono text-muted">{localDensities[inst] || 4}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={localDensities[inst] || 4}
                      onChange={(e) => handleDensityChange(inst, e.target.value)}
                      className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="enable-task-override"
                checked={enableTask}
                onChange={(e) => setEnableTask(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary accent-primary bg-surface"
              />
              <label htmlFor="enable-task-override" className="text-sm font-semibold text-text select-none cursor-pointer">
                Override SFT Task for Generation
              </label>
            </div>
            
            {enableTask && (
              <div className="grid grid-cols-2 gap-1.5 p-2 bg-surface/20 border border-border/50 rounded-lg animate-in slide-in-from-top-2 duration-200">
                {[
                  { id: 'auto', label: '🔍 Auto-detect' },
                  { id: 'meta', label: '✨ Meta' },
                  { id: 'meta_past', label: '➡️ Past' },
                  { id: 'meta_future', label: '⬅️ Future' },
                  { id: 'infill', label: '↕️ Infill' },
                  { id: 'inst_comp', label: '🎻 Arrangement' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setLocalTask(t.id)}
                    className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200 border ${
                      localTask === t.id
                        ? 'bg-primary text-white border-primary shadow shadow-primary/20 scale-[1.02]'
                        : 'bg-surface border-border text-muted hover:text-text hover:bg-surface/80 hover:border-primary/30'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-surface/30 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-2 px-4 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary py-2 px-5 text-sm font-semibold shadow-lg shadow-primary/20"
          >
            Apply Settings
          </button>
        </div>
      </div>

      <KeySelector
        open={keySelectorOpen}
        onClose={() => setKeySelectorOpen(false)}
        onSave={setLocalKey}
        currentKey={localKey}
      />
    </div>
  );
}

export default App;
