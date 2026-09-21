import { describe, it, expect } from 'vitest'
import {
  scoreMatch,
  findBestMatches,
  findBestParcelsForTrip,
  diagnoseParcelTripMatching,
  mapDbTripToDomain,
  mapDbParcelToDomain,
  routeCompatibility,
  dateAlignment,
  capacityFit,
  priceCompatibility,
  Trip,
  Parcel,
} from '@/lib/smart-matching'

describe('Smart Matching Engine', () => {
  const baseTrip: Trip = {
    id: 'trip-1',
    userId: 'user-traveler-1',
    fromCity: 'Mumbai',
    toCity: 'Pune',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    totalCapacity: 10,
    availableCapacity: 8,
    pricePerKg: 60,
    status: 'active',
    userRating: 4.8,
  }

  const baseParcel: Parcel = {
    id: 'parcel-1',
    userId: 'user-sender-1',
    fromCity: 'Mumbai',
    toCity: 'Pune',
    weight: 3,
    priceOffer: 250,
    createdAt: new Date().toISOString(),
    status: 'open',
  }

  it('calculates perfect route compatibility for identical cities', () => {
    const routeScore = routeCompatibility(baseTrip, baseParcel)
    expect(routeScore).toBe(100)
  })

  it('calculates high match score for aligned trip and parcel', () => {
    const result = scoreMatch(baseTrip, baseParcel)
    expect(result.total).toBeGreaterThanOrEqual(75)
    expect(result.grade).toBe('excellent')
    expect(result.breakdown.routeScore).toBe(100)
    expect(result.breakdown.capacityScore).toBeGreaterThanOrEqual(80)
  })

  it('penalizes capacity overages correctly', () => {
    const heavyParcel: Parcel = { ...baseParcel, weight: 15 }
    const capacityScore = capacityFit(baseTrip.availableCapacity, heavyParcel.weight)
    expect(capacityScore).toBe(0)

    const result = scoreMatch(baseTrip, heavyParcel)
    expect(result.breakdown.capacityScore).toBe(0)
  })

  it('evaluates price compatibility accurately', () => {
    // 3kg * 60 = 180. Offer is 250. Should be 100%
    expect(priceCompatibility(60, 250, 3)).toBe(100)
    // 3kg * 60 = 180. Offer is 100. Ratio = 100/180 = 0.55 -> 40%
    expect(priceCompatibility(60, 100, 3)).toBe(40)
  })

  it('ranks candidate trips in descending order of score', () => {
    const tripA: Trip = { ...baseTrip, id: 'trip-a', pricePerKg: 50, userRating: 5.0 }
    const tripB: Trip = { ...baseTrip, id: 'trip-b', fromCity: 'Delhi', toCity: 'Jaipur' } // unrelated route

    const matches = findBestMatches(baseParcel, [tripA, tripB])
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches[0].trip.id).toBe('trip-a')
  })

  it('ranks candidate parcels for a traveler', () => {
    const parcelA: Parcel = { ...baseParcel, id: 'p-a', weight: 4 }
    const parcelB: Parcel = { ...baseParcel, id: 'p-b', fromCity: 'Kolkata', toCity: 'Chennai' } // wrong route

    const matches = findBestParcelsForTrip(baseTrip, [parcelA, parcelB])
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches[0].parcel.id).toBe('p-a')
  })

  it('diagnoses unserved corridors when no trips exist', () => {
    const diagnostic = diagnoseParcelTripMatching(baseParcel, [])
    expect(diagnostic.reason).toBe('corridor_unserved')
    expect(diagnostic.actions.length).toBeGreaterThan(0)
  })

  it('diagnoses capacity exceeded when parcel is too heavy for all trips', () => {
    const heavyParcel: Parcel = { ...baseParcel, weight: 20 }
    const diagnostic = diagnoseParcelTripMatching(heavyParcel, [baseTrip])
    expect(diagnostic.reason).toBe('capacity_exceeded')
    expect(diagnostic.actions.some((a) => a.id === 'split_parcel')).toBe(true)
  })

  it('correctly maps raw database records to domain objects', () => {
    const dbTrip = {
      id: 'db-1',
      user_id: 'usr-1',
      from_city: 'Mumbai',
      to_city: 'Delhi',
      date: '2026-09-25',
      available_capacity: 5,
      price_per_kg: 70,
      user_rating: 4.9,
    }
    const domainTrip = mapDbTripToDomain(dbTrip)
    expect(domainTrip.fromCity).toBe('Mumbai')
    expect(domainTrip.availableCapacity).toBe(5)
    expect(domainTrip.pricePerKg).toBe(70)

    const dbParcel = {
      id: 'db-p1',
      user_id: 'usr-2',
      from_city: 'Delhi',
      to_city: 'Jaipur',
      weight: 2.5,
      price_offer: 300,
    }
    const domainParcel = mapDbParcelToDomain(dbParcel)
    expect(domainParcel.fromCity).toBe('Delhi')
    expect(domainParcel.weight).toBe(2.5)
    expect(domainParcel.priceOffer).toBe(300)
  })
})
