import React from 'react';
import { useTheme } from './ThemeContext';

const ThemeSwitcherVertical = () => {
  const { theme, setAppTheme } = useTheme();

  const themes = [
    { name: 'Ocean', value: 'blue', color: '#007BFF', textColor: '#fff' },
    { name: 'Volcanic', value: 'red', color: '#dc3545', textColor: '#fff' },
    { name: 'Leaf', value: 'green', color: '#28a745', textColor: '#fff' },
    { name: 'Dark', value: 'dark', color: '#343a40', textColor: '#fff' },
    { name: 'Brown', value: 'brown', color: '#8B4513', textColor: '#fff' },
    { name: 'Navi', value: 'Rose', color: '#1A4862', textColor: '#fff' }, // Correct Navi color
  ];

  return (
    <div className="d-flex flex-column p-2 gap-1">
      {themes.map((t) => (
        <div
          key={t.value}
          className="dropdown-item d-flex align-items-center"
          style={{
            backgroundColor: t.color,
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: '0.2s',
            boxShadow: theme === t.value ? '0 0 0 3px rgba(0, 123, 255, 0.5)' : 'none',
          }}
          onClick={() => setAppTheme(t.value)}
          title={`Select ${t.name} Theme`}
        >
          {theme === t.value &&
            <span style={{ color: t.textColor, fontSize: '16px' }}>✓</span>}
        </div>
      ))}
    </div>
  );
};

export default ThemeSwitcherVertical ;
