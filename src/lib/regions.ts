export type Provider = "aws" | "gcp";

export interface Region {
  id: string;
  code: string;
  abbreviation: string;
  provider: Provider;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export const regions: Region[] = [
  // AWS Regions
  {
    id: "us-east-1",
    code: "us-east-1",
    abbreviation: "us1",
    provider: "aws",
    city: "N. Virginia",
    country: "USA",
    lat: 39.0438,
    lon: -77.4874,
  },
  {
    id: "us-east-2",
    code: "us-east-2",
    abbreviation: "use2",
    provider: "aws",
    city: "Ohio",
    country: "USA",
    lat: 40.4173,
    lon: -82.9071,
  },
  {
    id: "us-west-1",
    code: "us-west-1",
    abbreviation: "us2",
    provider: "aws",
    city: "N. California",
    country: "USA",
    lat: 37.3382,
    lon: -121.8863,
  },
  {
    id: "us-west-2",
    code: "us-west-2",
    abbreviation: "us3",
    provider: "aws",
    city: "Oregon",
    country: "USA",
    lat: 45.5152,
    lon: -122.6784,
  },
  {
    id: "ca-central-1",
    code: "ca-central-1",
    abbreviation: "cac1",
    provider: "aws",
    city: "Montreal",
    country: "Canada",
    lat: 45.5017,
    lon: -73.5673,
  },
  {
    id: "eu-west-1",
    code: "eu-west-1",
    abbreviation: "eu1",
    provider: "aws",
    city: "Ireland",
    country: "Ireland",
    lat: 53.3498,
    lon: -6.2603,
  },
  {
    id: "eu-west-2",
    code: "eu-west-2",
    abbreviation: "euw2",
    provider: "aws",
    city: "London",
    country: "UK",
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: "eu-central-1",
    code: "eu-central-1",
    abbreviation: "eu2",
    provider: "aws",
    city: "Frankfurt",
    country: "Germany",
    lat: 50.1109,
    lon: 8.6821,
  },
  {
    id: "ap-south-1",
    code: "ap-south-1",
    abbreviation: "as1",
    provider: "aws",
    city: "Mumbai",
    country: "India",
    lat: 19.076,
    lon: 72.8777,
  },
  {
    id: "ap-northeast-1",
    code: "ap-northeast-1",
    abbreviation: "apn1",
    provider: "aws",
    city: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
  },
  {
    id: "ap-southeast-1",
    code: "ap-southeast-1",
    abbreviation: "ap1",
    provider: "aws",
    city: "Singapore",
    country: "Singapore",
    lat: 1.3521,
    lon: 103.8198,
  },
  {
    id: "ap-southeast-2",
    code: "ap-southeast-2",
    abbreviation: "ap2",
    provider: "aws",
    city: "Sydney",
    country: "Australia",
    lat: -33.8688,
    lon: 151.2093,
  },
  {
    id: "sa-east-1",
    code: "sa-east-1",
    abbreviation: "sa1",
    provider: "aws",
    city: "São Paulo",
    country: "Brazil",
    lat: -23.5505,
    lon: -46.6333,
  },
  {
    id: "af-south-1",
    code: "af-south-1",
    abbreviation: "afs1",
    provider: "aws",
    city: "Cape Town",
    country: "South Africa",
    lat: -33.9249,
    lon: 18.4241,
  },
  // GCP Regions
  {
    id: "us-east4",
    code: "us-east4",
    abbreviation: "use4",
    provider: "gcp",
    city: "Ashburn",
    country: "USA",
    lat: 39.0438,
    lon: -77.4874,
  },
  {
    id: "us-central1",
    code: "us-central1",
    abbreviation: "usc1",
    provider: "gcp",
    city: "Iowa",
    country: "USA",
    lat: 41.2619,
    lon: -95.8608,
  },
  {
    id: "europe-west1",
    code: "europe-west1",
    abbreviation: "euw1",
    provider: "gcp",
    city: "Belgium",
    country: "Belgium",
    lat: 50.4697,
    lon: 3.811,
  },
  {
    id: "asia-northeast1",
    code: "asia-northeast1",
    abbreviation: "ane1",
    provider: "gcp",
    city: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
  },
];

export function getRegionById(id: string): Region | undefined {
  return regions.find((r) => r.id === id);
}

export function getRegionsByProvider(provider: Provider): Region[] {
  return regions.filter((r) => r.provider === provider);
}

export interface RegionGroup {
  key: string;
  lat: number;
  lon: number;
  regions: Region[];
}

/**
 * Group regions that share the same (or very close) coordinates into a single marker.
 * E.g. us-east-1 (AWS) and us-east4 (GCP) both sit in Virginia.
 */
export function groupRegionsByLocation(
  regionList: Region[] = regions
): RegionGroup[] {
  const groups: Map<string, RegionGroup> = new Map();

  for (const region of regionList) {
    // Round to 1 decimal place to catch co-located regions
    const key = `${region.lat.toFixed(1)},${region.lon.toFixed(1)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.regions.push(region);
    } else {
      groups.set(key, {
        key,
        lat: region.lat,
        lon: region.lon,
        regions: [region],
      });
    }
  }

  return Array.from(groups.values());
}
