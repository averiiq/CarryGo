import { describe, it, expect } from 'vitest'
import {
  findCity,
  searchCities,
  haversineDistance,
  getRouteDistance,
  getRouteEstimate,
  INDIAN_CITIES,
} from '@/lib/indian-cities'

describe('Haryana Cities & Route Intelligence', () => {
  it('should have Haryana cities populated across all 22 districts', () => {
    expect(INDIAN_CITIES.length).toBe(31)
    const metros = INDIAN_CITIES.filter((c) => c.tier === 'metro')
    expect(metros.length).toBe(2) // Gurugram, Faridabad
    expect(INDIAN_CITIES.every((c) => c.state === 'Haryana')).toBe(true)
  })

  it('should find city by exact and case-insensitive name', () => {
    const gurugram = findCity('Gurugram')
    expect(gurugram).toBeDefined()
    expect(gurugram?.state).toBe('Haryana')

    const faridabad = findCity('faridabad')
    expect(faridabad).toBeDefined()
    expect(faridabad?.name).toBe('Faridabad')

    const invalid = findCity('NonExistentCityXYZ')
    expect(invalid).toBeUndefined()
  })

  it('should search cities with prefix prioritization and tier ranking', () => {
    const results = searchCities('Guru')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('Gurugram')

    const emptySearch = searchCities('')
    expect(emptySearch.length).toBe(8)
    expect(emptySearch[0].tier).toBe('metro')
  })

  it('should calculate accurate Haversine distance between Gurugram and Faridabad', () => {
    const gurugram = findCity('Gurugram')!
    const faridabad = findCity('Faridabad')!
    const distance = haversineDistance(gurugram.lat, gurugram.lng, faridabad.lat, faridabad.lng)

    // Straight-line distance between Gurugram & Faridabad is ~30-35 km
    expect(distance).toBeGreaterThan(25)
    expect(distance).toBeLessThan(40)

    const routeDistance = getRouteDistance('Gurugram', 'Faridabad')
    // Road distance with tortuosity factor ~35-50 km
    expect(routeDistance).toBeGreaterThan(30)
    expect(routeDistance).toBeLessThan(55)
  })

  it('should provide comprehensive route estimates for Haryana corridors', () => {
    const estimate = getRouteEstimate('Gurugram', 'Faridabad')
    expect(estimate).not.toBeNull()
    expect(estimate?.distanceKm).toBeGreaterThan(30)
    expect(estimate?.driveHours).toBeGreaterThanOrEqual(0.5)
    expect(estimate?.basePriceEstimate).toBeGreaterThanOrEqual(35)
    expect(estimate?.recommendedVehicle).toBe('car')

    // Long intra-Haryana distance: Sirsa to Faridabad
    const longDist = getRouteEstimate('Sirsa', 'Faridabad')
    expect(longDist).not.toBeNull()
    expect(longDist?.distanceKm).toBeGreaterThan(250)
    expect(longDist?.flightHours).toBeNull() // No flights within Haryana
    expect(longDist?.recommendedVehicle).toBe('train')
  })

  it('should return null for invalid city pairs', () => {
    const estimate = getRouteEstimate('UnknownCityA', 'UnknownCityB')
    expect(estimate).toBeNull()
  })
})
