import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../constants/theme';
import { storage } from '../services/storage';

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: any) => {
  const deviceTheme = useDeviceColorScheme();
  const [isDark, setIsDark] = useState(deviceTheme === 'dark');

  useEffect(() => {
    storage.getTheme().then((t) => {
      if (t === 'dark' || t === 'light') {
        setIsDark(t === 'dark');
      }
    });
  }, []);

  const toggleTheme = (val: boolean) => {
    setIsDark(val);
    storage.saveTheme(val ? 'dark' : 'light');
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
