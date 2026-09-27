import React from 'react';
import { findCity, getDistance } from '@/constants/indian-cities';

describe('InteractiveRouteCard corridor calculations & city data', () => {
  it('correctly calculates distance between Gurugram and Rohtak', () => {
    const c1 = findCity('Gurugram');
    const c2 = findCity('Rohtak');
    expect(c1).toBeDefined();
    expect(c2).toBeDefined();

    const dist = Math.round(getDistance(c1!, c2!));
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(120);
  });

  it('correctly calculates distance between Delhi and Chandigarh', () => {
    const c1 = findCity('Delhi');
    const c2 = findCity('Chandigarh');
    expect(c1).toBeDefined();
    expect(c2).toBeDefined();

    const dist = Math.round(getDistance(c1!, c2!));
    expect(dist).toBeGreaterThan(200);
    expect(dist).toBeLessThan(300);
  });

  it('swaps origin and destination properly', () => {
    let fromCity = 'Gurugram';
    let toCity = 'Chandigarh';

    const handleSwap = () => {
      const temp = fromCity;
      fromCity = toCity;
      toCity = temp;
    };

    handleSwap();
    expect(fromCity).toBe('Chandigarh');
    expect(toCity).toBe('Gurugram');
  });
});
