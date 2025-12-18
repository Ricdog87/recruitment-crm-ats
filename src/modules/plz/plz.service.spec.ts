import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlzService } from './plz.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PlzService', () => {
  let service: PlzService;
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = {
      plzGeodata: {
        findUnique: vi.fn(),
      },
    } as any;

    service = new PlzService(prismaService);
  });

  describe('haversineDistance', () => {
    it('should calculate distance between Berlin and Munich correctly', () => {
      const berlinLat = 52.531677;
      const berlinLon = 13.3888599;
      const munichLat = 48.1374;
      const munichLon = 11.5755;

      const distance = service.haversineDistance(berlinLat, berlinLon, munichLat, munichLon);

      expect(distance).toBeGreaterThan(500);
      expect(distance).toBeLessThan(600);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.haversineDistance(52.5, 13.4, 52.5, 13.4);
      expect(distance).toBe(0);
    });

    it('should calculate distance between Hamburg and Berlin correctly', () => {
      const hamburgLat = 53.5511;
      const hamburgLon = 9.9937;
      const berlinLat = 52.531677;
      const berlinLon = 13.3888599;

      const distance = service.haversineDistance(hamburgLat, hamburgLon, berlinLat, berlinLon);

      expect(distance).toBeGreaterThan(250);
      expect(distance).toBeLessThan(300);
    });
  });

  describe('calculateDistance', () => {
    it('should return null when PLZ not found', async () => {
      vi.spyOn(prismaService.plzGeodata, 'findUnique').mockResolvedValue(null);

      const result = await service.calculateDistance('99999', '10115');

      expect(result).toBeNull();
    });

    it('should calculate distance when both PLZ exist', async () => {
      vi.spyOn(prismaService.plzGeodata, 'findUnique')
        .mockResolvedValueOnce({
          plz: '10115',
          city: 'Berlin',
          latitude: 52.531677 as any,
          longitude: 13.3888599 as any,
        })
        .mockResolvedValueOnce({
          plz: '80331',
          city: 'Munich',
          latitude: 48.1374 as any,
          longitude: 11.5755 as any,
        });

      const result = await service.calculateDistance('10115', '80331');

      expect(result).toBeGreaterThan(500);
      expect(result).toBeLessThan(600);
    });
  });
});
