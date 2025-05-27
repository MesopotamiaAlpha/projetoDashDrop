import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false);

    // Carregar preferência do localStorage ao iniciar
    useEffect(() => {
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme !== null) {
            setDarkMode(JSON.parse(savedTheme));
        }
    }, []);

    // Aplicar classe ao body quando o tema mudar
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }
        // Salvar preferência no localStorage
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    // Função para alternar entre temas
    const toggleTheme = () => {
        setDarkMode(prevMode => !prevMode);
    };

    // Função para definir um tema específico
    const setTheme = (isDark) => {
        setDarkMode(isDark);
    };

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
