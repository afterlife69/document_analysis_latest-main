import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, Stack } from '@mui/material';
import { Home, Description, ArrowBack } from '@mui/icons-material';

const Navbar = () => {
  const location = useLocation();

return (
    <AppBar sx={{ 
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--surface-3)',
        boxShadow: 'none',
    }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2}>
                <Button
                    component={Link}
                    to="/home"
                    startIcon={<Home />}
                    sx={{
                        color: 'var(--fg)',
                        '&:hover': {
                            background: 'var(--surface-3)',
                            transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.2s var(--ease-out)',
                    }}
                >
                    Home
                </Button>
                {(location.pathname !== '/pdf') && <Button
                    component={Link}
                    to="/pdf"
                    startIcon={<Description />}
                    sx={{
                        color: 'var(--fg)',
                        '&:hover': {
                            background: 'var(--surface-3)',
                            transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.2s var(--ease-out)',
                    }}
                >
                    Documents
                </Button>}
            </Stack>
        </Toolbar>
    </AppBar>
);
};

export default Navbar;
