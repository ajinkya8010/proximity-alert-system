/**
 * Unit tests for haversineDistance function
 * Tests the Haversine formula implementation for calculating distances between coordinates
 */

import { haversineDistance } from '../../utils/distance.js';

describe('haversineDistance', () => {
  describe('Basic functionality', () => {
    it('should calculate distance between two known coordinates', () => {
      // New York City to Los Angeles (approx 3936 km)
      const nyc = [-74.006, 40.7128]; // [lng, lat]
      const la = [-118.2437, 34.0522];
      
      const distance = haversineDistance(nyc, la);
      
      // Allow 1% margin of error
      expect(distance).toBeGreaterThan(3900000); // > 3900 km
      expect(distance).toBeLessThan(4000000);    // < 4000 km
    });

    it('should return 0 for same location', () => {
      const coords = [0, 0];
      const distance = haversineDistance(coords, coords);
      
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Two points ~1km apart
      const point1 = [0, 0];
      const point2 = [0.009, 0]; // ~1km east
      
      const distance = haversineDistance(point1, point2);
      
      // Should be approximately 1000 meters (±50m)
      expect(distance).toBeGreaterThan(950);
      expect(distance).toBeLessThan(1050);
    });
  });

  describe('Edge cases', () => {
    it('should handle equator coordinates', () => {
      const point1 = [0, 0];
      const point2 = [1, 0];
      
      const distance = haversineDistance(point1, point2);
      
      // 1 degree longitude at equator ≈ 111km
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    it('should handle polar coordinates', () => {
      const northPole = [0, 90];
      const nearNorthPole = [0, 89];
      
      const distance = haversineDistance(northPole, nearNorthPole);
      
      // 1 degree latitude ≈ 111km
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    it('should handle antipodal points (opposite sides of Earth)', () => {
      const point1 = [0, 0];
      const point2 = [180, 0];
      
      const distance = haversineDistance(point1, point2);
      
      // Half Earth's circumference ≈ 20,000 km
      expect(distance).toBeGreaterThan(19900000);
      expect(distance).toBeLessThan(20100000);
    });

    it('should handle negative coordinates', () => {
      const point1 = [-74.006, 40.7128]; // NYC (negative longitude)
      const point2 = [-73.935, 40.7306];  // Nearby point
      
      const distance = haversineDistance(point1, point2);
      
      // Should be a few kilometers
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10000);
    });
  });

  describe('Symmetry and consistency', () => {
    it('should return same distance regardless of order', () => {
      const point1 = [10, 20];
      const point2 = [30, 40];
      
      const distance1 = haversineDistance(point1, point2);
      const distance2 = haversineDistance(point2, point1);
      
      expect(distance1).toBe(distance2);
    });

    it('should handle very close points', () => {
      const point1 = [0, 0];
      const point2 = [0.0001, 0.0001]; // ~15 meters apart
      
      const distance = haversineDistance(point1, point2);
      
      expect(distance).toBeGreaterThan(10);
      expect(distance).toBeLessThan(20);
    });

    it('should be consistent with multiple calculations', () => {
      const point1 = [10, 20];
      const point2 = [30, 40];
      
      const distance1 = haversineDistance(point1, point2);
      const distance2 = haversineDistance(point1, point2);
      const distance3 = haversineDistance(point1, point2);
      
      expect(distance1).toBe(distance2);
      expect(distance2).toBe(distance3);
    });
  });

  describe('Real-world scenarios', () => {
    it('should calculate distance within a city (Mumbai example)', () => {
      const gateway = [72.8347, 18.9220]; // Gateway of India
      const airport = [72.8777, 19.0896]; // Mumbai Airport
      
      const distance = haversineDistance(gateway, airport);
      
      // Approximately 20-25 km
      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(26000);
    });

    it('should calculate distance for alert radius use case', () => {
      const userLocation = [77.5946, 12.9716]; // Bangalore
      const alertLocation = [77.6101, 12.9698]; // ~1.5km away
      
      const distance = haversineDistance(userLocation, alertLocation);
      
      // Should be within typical alert radius (1-2 km)
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(2000);
    });

    it('should verify user is within 3km alert radius', () => {
      const userLocation = [0, 0];
      const alertLocation = [0.02, 0]; // ~2.2km away
      const alertRadius = 3000; // 3km
      
      const distance = haversineDistance(userLocation, alertLocation);
      
      expect(distance).toBeLessThan(alertRadius);
    });

    it('should verify user is outside 1km alert radius', () => {
      const userLocation = [0, 0];
      const alertLocation = [0.02, 0]; // ~2.2km away
      const alertRadius = 1000; // 1km
      
      const distance = haversineDistance(userLocation, alertLocation);
      
      expect(distance).toBeGreaterThan(alertRadius);
    });
  });

  describe('Input validation behavior', () => {
    it('should handle array destructuring correctly', () => {
      const coords1 = [-74.006, 40.7128];
      const coords2 = [-73.935, 40.7306];
      
      // Should not throw error
      expect(() => haversineDistance(coords1, coords2)).not.toThrow();
    });

    it('should work with integer coordinates', () => {
      const point1 = [0, 0];
      const point2 = [1, 1];
      
      const distance = haversineDistance(point1, point2);
      
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should work with floating point coordinates', () => {
      const point1 = [77.594566, 12.971599];
      const point2 = [77.610116, 12.969847];
      
      const distance = haversineDistance(point1, point2);
      
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });
  });
});
