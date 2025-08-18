import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ModelSelector from './ModelSelector';
import ShortcutGuide from './ShortcutGuide';

const Header = ({ toggleColorMode, mode }) => {
    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    MORTM - HUB ver.1.6.2
                </Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                    <ModelSelector />
                </Box>
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <ShortcutGuide />
                    <IconButton onClick={toggleColorMode} color="inherit">
                        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;