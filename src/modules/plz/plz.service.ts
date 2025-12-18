import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlzService {
  constructor(private prisma: PrismaService) {}

  async getCoordinates(plz: string) {
    return this.prisma.plzGeodata.findUnique({
      where: { plz },
    });
  }

  async calculateDistance(plz1: string, plz2: string): Promise<number | null> {
    const [geo1, geo2] = await Promise.all([
      this.getCoordinates(plz1),
      this.getCoordinates(plz2),
    ]);

    if (!geo1 || !geo2) {
      return null;
    }

    return this.haversineDistance(
      Number(geo1.latitude),
      Number(geo1.longitude),
      Number(geo2.latitude),
      Number(geo2.longitude),
    );
  }

  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
