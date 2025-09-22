import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, CssBaseline, Box, ThemeProvider, createTheme, Grid, CircularProgress, Typography } from '@mui/material';
import * as Tone from 'tone';
import Header from './components/Header.jsx';
import MidiInput from './components/MidiInput.jsx';
import Settings from './components/Settings.jsx';
import AdvancedSettings from './components/AdvancedSettings.jsx';
import Controls from './components/Controls.jsx';
import PianoRoll from './components/PianoRoll.jsx';

function App() {
  const [mode, setMode] = useState('light');

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const [midiData, setMidiData] = useState(null);
  const [playbackState, setPlaybackState] = useState('stopped'); // 'stopped', 'playing', 'paused'
  const [progress, setProgress] = useState(0);
  const [samplerLoaded, setSamplerLoaded] = useState(false);
  const [generationLength, setGenerationLength] = useState(12);
  const [instrument, setInstrument] = useState('piano');
  const [tempo, setTempo] = useState(120);
  const [selectedModel, setSelectedModel] = useState('');

  const samplerRef = useRef(null);
  const scheduledEventsRef = useRef([]);

  useEffect(() => {
    setSamplerLoaded(false);
    if (samplerRef.current) {
      samplerRef.current.dispose();
    }

    if (instrument === 'piano') {
      samplerRef.current = new Tone.Sampler({
        urls: {
          A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
          C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3', C3: 'C3.mp3',
          'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3',
          'F#4': 'Fs4.mp3', A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
          A5: 'A5.mp3', C6: 'C6.mp3',
        },
        release: 1,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
        onload: () => {
          setSamplerLoaded(true);
        }
      }).toDestination();
    } else if (instrument === 'saxophone') {
      // Using FMSynth as a placeholder for saxophone
      samplerRef.current = new Tone.FMSynth().toDestination();
      setSamplerLoaded(true);
    }
  }, [instrument]);

  useEffect(() => {
    if (midiData && samplerLoaded) {
      // Clear any previously scheduled events
      scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
      scheduledEventsRef.current = [];

      const notes = midiData.tracks.flatMap(track => track.notes);
      const scheduledEvents = notes.map(note =>
        Tone.Transport.schedule(time => {
          if(samplerRef.current) {
            samplerRef.current.triggerAttackRelease(note.name, note.duration, time, note.velocity);
          }
        }, note.time)
      );
      scheduledEventsRef.current = scheduledEvents;

      // Set transport loop for playback progress
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = midiData.duration;
    }
  }, [midiData, samplerLoaded]);

  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  const handleMidiUpload = (newMidiData) => {
    if (playbackState !== 'stopped') {
      handleStop();
    }
    setMidiData(newMidiData);
    if (newMidiData.header.tempos.length > 0) {
      setTempo(Math.round(newMidiData.header.tempos[0].bpm));
    }
  };

  const handlePlay = async () => {
    if (!midiData || !samplerLoaded) return;

    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    if (playbackState === 'paused') {
      Tone.Transport.start();
    } else {
      Tone.Transport.start();
    }
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

  useEffect(() => {
    if (playbackState === 'playing') {
      const id = Tone.Transport.scheduleRepeat(time => {
        Tone.Draw.schedule(() => {
          setProgress(Tone.Transport.progress);
        }, time);
      }, '16n');

      return () => {
        Tone.Transport.clear(id);
      };
    }
  }, [playbackState]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (playbackState === 'playing') {
          handlePause();
        } else {
          handlePlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [playbackState, handlePlay, handlePause]);

  const duration = midiData ? midiData.duration : 0;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header toggleColorMode={toggleColorMode} mode={theme.palette.mode} />
      <Container maxWidth="xl" sx={{ my: 2 }}>
        {!samplerLoaded ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading Samples...</Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <MidiInput onMidiUpload={handleMidiUpload} />
              <Settings 
                instrument={instrument}
                setInstrument={setInstrument}
                tempo={tempo}
                setTempo={setTempo}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
              />
              <AdvancedSettings />
              <Controls
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                playbackState={playbackState}
                progress={progress}
                duration={duration}
              />
            </Grid>
            <Grid item xs={12} md={7}>
              <PianoRoll
                midiData={midiData}
                progress={progress}
                duration={duration}
                generationLength={generationLength}
                setGenerationLength={setGenerationLength}
                onSeek={handleSeek}
              />
            </Grid>
          </Grid>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;