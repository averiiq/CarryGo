import { describe, it, expect } from 'vitest'
import {
  findCity,
  searchCities,
  haversineDistance,
  getRouteDistance,
  getRouteEstimate,
  INDIAN_CITIES,
} from '@/lib/indian-cities'

describe('Indian Cities & Route Intelligence', () => {
  it('should have cities populated across all tiers', () => {
    expect(INDIAN_CITIES.length).toBeGreaterThan(40)
    const metros = INDIAN_CITIES.filter((c) => c.tier === 'metro')
    expect(metros.length).toBe(6) // Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata
  })

  it('should find city by exact and case-insensitive name', () => {
    const mumbai = findCity('Mumbai')
    expect(mumbai).toBeDefined()
    expect(mumbai?.state).toBe('Maharashtra')

    const pune = findCity('pune')
    expect(pune).toBeDefined()
    expect(pune?.name).toBe('Pune')

    const invalid = findCity('NonExistentCityXYZ')
    expect(invalid).toBeUndefined()
  })

  it('should search cities with prefix prioritization and tier ranking', () => {
    const results = searchCities('Mum')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('Mumbai')

    const emptySearch = searchCities('')
    expect(emptySearch.length).toBe(8)
    expect(emptySearch[0].tier).toBe('metro')
  })

  it('should calculate accurate Haversine distance between Mumbai and Pune', () => {
    const mumbai = findCity('Mumbai')!
    const pune = findCity('Pune')!
    const distance = haversineDistance(mumbai.lat, mumbai.lng, pune.lat, pune.lng)

    // Straight-line distance between Mumbai & Pune is ~120-130 km
    expect(distance).toBeGreaterThan(110)
    expect(distance).toBeLessThan(140)

    const routeDistance = getRouteDistance('Mumbai', 'Pune')
    // Road distance with tortuosity factor ~140-160 km
    expect(routeDistance).toBeGreaterThan(130)
    expect(routeDistance).toBeLessThan(175)
  })

  it('should provide comprehensive route estimates', () => {
    const estimate = getRouteEstimate('Mumbai', 'Pune')
    expect(estimate).not.toBeNull()
    expect(estimate?.distanceKm).toBeGreaterThan(130)
    expect(estimate?.driveHours).toBeGreaterThan(1.5)
    expect(estimate?.basePriceEstimate).toBeGreaterThanOrEqual(40)
    expect(estimate?.recommendedVehicle).toBe('car')

    // Long distance: Delhi to Bangalore
    const longDist = getRouteEstimate('Delhi', 'Bangalore')
    expect(longDist).not.toBeNull()
    expect(longDist?.distanceKm).toBeGreaterThan(1800)
    expect(longDist?.flightHours).not.toBeNull()
    expect(longDist?.recommendedVehicle).toBe('flight')
  })

  it('should return null for invalid city pairs', () => {
    const estimate = getRouteEstimate('UnknownCityA', 'UnknownCityB')
    expect(estimate).toBeNull()
  })
})
