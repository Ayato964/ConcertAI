import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, CssBaseline, Box, ThemeProvider, createTheme, IconButton } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import * as Tone from 'tone';
import Header from './components/Header.jsx';
import ModelSelector from './components/ModelSelector.jsx';
import MidiInput from './components/MidiInput.jsx';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState(12);

  const synthRef = useRef(null);
  const scheduledEventsRef = useRef([]);

  useEffect(() => {
    if (midiData) {
      scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
      scheduledEventsRef.current = [];

      if (!synthRef.current) {
        synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
      }

      const notes = midiData.tracks.flatMap(track => track.notes);
      const scheduledEvents = notes.map(note =>
        Tone.Transport.schedule(time => {
          synthRef.current.triggerAttackRelease(note.name, note.duration, time, note.velocity);
        }, note.time)
      );
      scheduledEventsRef.current = scheduledEvents;
    }
  }, [midiData]);

  const handlePlay = async () => {
    if (!midiData) return;

    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    Tone.Transport.start();
    setIsPlaying(true);
  };

  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setIsPlaying(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header />
      {/* ↓↓↓ "disableGutters" を削除し、シンプルなContainerに戻します ↓↓↓ */}
      <Container>
        {/* 手動で設定したパディング用のBoxは不要なので削除 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
          <IconButton onClick={toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Box>

        <Box sx={{ my: 2 }}>
          <ModelSelector />
          <MidiInput onMidiUpload={setMidiData} />
          <AdvancedSettings />
          <Controls
            onPlay={handlePlay}
            onStop={handleStop}
            isPlaying={isPlaying}
          />
          <PianoRoll
            midiData={midiData}
            selectedMeasure={selectedMeasure}
            setSelectedMeasure={setSelectedMeasure}
          />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;