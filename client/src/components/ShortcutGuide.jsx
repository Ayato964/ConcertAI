import React, { useState } from 'react';
import {
    IconButton, Popover, Typography, Box, List, ListItem, ListItemText, Divider
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const shortcuts = [
    { key: 'Space', description: 'Play / Pause' },
    { key: 'Shift + Wheel', description: 'Piano Roll Horizontal Scroll' },
    { key: 'Ctrl + Wheel', description: 'Piano Roll Horizontal Zoom' },
    { key: 'Alt + Wheel', description: 'Piano Roll Vertical Zoom' },
];

const ShortcutGuide = () => {
    const [anchorEl, setAnchorEl] = useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'shortcut-guide-popover' : undefined;

    return (
        <>
            <IconButton onClick={handleClick} color="inherit">
                <HelpOutlineIcon />
            </IconButton>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Keyboard Shortcuts
                    </Typography>
                    <List dense>
                        {shortcuts.map((shortcut, index) => (
                            <React.Fragment key={index}>
                                <ListItem>
                                    <ListItemText primary={shortcut.key} secondary={shortcut.description} />
                                </ListItem>
                                {index < shortcuts.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                </Box>
            </Popover>
        </>
    );
};

export default ShortcutGuide;