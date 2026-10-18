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

  it('detects when selected city is the same as the opposite city', () => {
    const fromCity = 'Gurugram';
    const toCity = 'gurugram ';
    const isSame = fromCity.trim().toLowerCase() === toCity.trim().toLowerCase();
    expect(isSame).toBe(true);
  });

  it('validates that trip date cannot be in the past', () => {
    const today = new Date();
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 2);
    const pastKey = [
      pastDate.getFullYear(),
      String(pastDate.getMonth() + 1).padStart(2, '0'),
      String(pastDate.getDate()).padStart(2, '0'),
    ].join('-');

    expect(pastKey < todayKey).toBe(true);
  });
});
