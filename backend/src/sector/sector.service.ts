import { Injectable } from '@nestjs/common';
import { getPool } from '../database';

interface SectorRow {
  areaId: number;
  areaName: string;
  sectorId: number;
  sectorName: string;
}

export interface AreaWithSectors {
  areaId: number;
  areaName: string;
  sectors: { id: number; name: string }[];
}

@Injectable()
export class SectorService {
  private readonly pool = getPool();

  /** Areas with their rooms, in the shape used by the menu's select fields. */
  async findAllGroupedByArea(): Promise<AreaWithSectors[]> {
    const { rows } = await this.pool.query<SectorRow>(`
      SELECT
        a.id   AS "areaId",
        a.name AS "areaName",
        s.id   AS "sectorId",
        s.name AS "sectorName"
      FROM area a
      JOIN sector s ON s.area_id = a.id
      ORDER BY a.name, s.name
    `);

    const grouped = new Map<number, AreaWithSectors>();

    for (const row of rows) {
      let area = grouped.get(row.areaId);

      if (!area) {
        area = { areaId: row.areaId, areaName: row.areaName, sectors: [] };
        grouped.set(row.areaId, area);
      }

      area.sectors.push({ id: row.sectorId, name: row.sectorName });
    }

    return Array.from(grouped.values());
  }
}
