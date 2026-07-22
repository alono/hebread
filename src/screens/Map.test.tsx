import { render, screen, within } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Map } from './Map';
import { LOGO } from '../constants';

function renderMap() {
  render(
    <HashRouter>
      <Map />
    </HashRouter>,
  );
}

describe('Map', () => {
  it('renders the niqqud-ed logo', () => {
    renderMap();
    expect(screen.getByTestId('logo')).toHaveTextContent(LOGO);
  });

  it('shows all 12 level stations', () => {
    renderMap();
    for (let id = 1; id <= 12; id++) {
      expect(screen.getByTestId(`level-${id}-station`)).toBeInTheDocument();
    }
  });

  it('every level is playable and exposes a play button', () => {
    renderMap();
    for (let id = 1; id <= 12; id++) {
      expect(screen.getByTestId(`level-${id}-station`)).toHaveAttribute('data-playable', 'true');
      expect(within(screen.getByTestId(`level-${id}-station`)).getByTestId(`level-${id}-play`)).toBeInTheDocument();
    }
  });

  it('offers a skip test on an uncompleted playable level', () => {
    renderMap();
    expect(within(screen.getByTestId('level-1-station')).getByTestId('level-1-skip')).toBeInTheDocument();
  });
});
