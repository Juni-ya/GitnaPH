import { Participant } from './types';

export interface PresetScenario {
  id: string;
  title: string;
  subtitle: string;
  participants: Participant[];
  weights: {
    alpha: number;
    beta: number;
  };
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'classic_debate',
    title: 'Malolos vs. General Trias',
    subtitle: 'NLEX and CAVITEX convergence across Metro Manila',
    participants: [
      {
        id: 'user_bulacan',
        name: 'Malolos, Bulacan',
        coordinates: [120.8113, 14.8527],
        color: '#38bdf8', // sky-400
      },
      {
        id: 'user_cavite',
        name: 'General Trias, Cavite',
        coordinates: [120.8808, 14.3879],
        color: '#f43f5e', // rose-500
      },
    ],
    weights: {
      alpha: 0.45,
      beta: 0.55,
    },
  },
  {
    id: 'tri_corridor_meetup',
    title: 'Bocaue, Bacoor, and Eastwood',
    subtitle: '3-way split between Bulacan, Cavite, and C5 Corridor',
    participants: [
      {
        id: 'user_bulacan',
        name: 'Bocaue, Bulacan',
        coordinates: [120.9482, 14.7736],
        color: '#38bdf8',
      },
      {
        id: 'user_cavite',
        name: 'Bacoor, Cavite',
        coordinates: [120.9427, 14.4642],
        color: '#f43f5e',
      },
      {
        id: 'user_rizal',
        name: 'Eastwood, Quezon City',
        coordinates: [121.0805, 14.6094],
        color: '#fbbf24', // amber-400
      },
    ],
    weights: {
      alpha: 0.4,
      beta: 0.6,
    },
  },
  {
    id: 'pampanga_to_alabang',
    title: 'San Fernando vs. Alabang',
    subtitle: 'Long-haul North to South expressway transit via Skyway',
    participants: [
      {
        id: 'user_north',
        name: 'San Fernando, Pampanga',
        coordinates: [120.6840, 15.0345],
        color: '#38bdf8',
      },
      {
        id: 'user_south',
        name: 'Filinvest, Alabang',
        coordinates: [121.0422, 14.4234],
        color: '#f43f5e',
      },
    ],
    weights: {
      alpha: 0.45,
      beta: 0.55,
    },
  },
];

export const PHILIPPINE_LOCATIONS = [
  { name: 'Malolos, Bulacan', coords: [120.8113, 14.8527] as [number, number] },
  { name: 'Bocaue / Marilao (NLEX)', coords: [120.9482, 14.7736] as [number, number] },
  { name: 'Balintawak (NLEX Entry)', coords: [120.9995, 14.6575] as [number, number] },
  { name: 'Monumento, Caloocan', coords: [120.9837, 14.6542] as [number, number] },
  { name: 'SM North EDSA / TriNoma', coords: [121.0333, 14.6538] as [number, number] },
  { name: 'EDSA Quezon Avenue', coords: [121.0400, 14.6420] as [number, number] },
  { name: 'Gateway Cubao / Araneta', coords: [121.0531, 14.6200] as [number, number] },
  { name: 'Eastwood City (C5 Libis)', coords: [121.0805, 14.6094] as [number, number] },
  { name: 'Ortigas Center / SM Megamall', coords: [121.0572, 14.5843] as [number, number] },
  { name: 'Robinsons Manila (Ermita)', coords: [120.9850, 14.5772] as [number, number] },
  { name: 'Intramuros / Rizal Park', coords: [120.9762, 14.5878] as [number, number] },
  { name: 'BGC Market! Market!', coords: [121.0550, 14.5490] as [number, number] },
  { name: 'Ayala Center / One Ayala (Makati)', coords: [121.0286, 14.5503] as [number, number] },
  { name: 'SM Mall of Asia (MOA)', coords: [120.9822, 14.5354] as [number, number] },
  { name: 'Ayala Malls Manila Bay', coords: [120.9897, 14.5240] as [number, number] },
  { name: 'PITX Megaterminal', coords: [120.9922, 14.5100] as [number, number] },
  { name: 'Bacoor Longos (CAVITEX)', coords: [120.9427, 14.4642] as [number, number] },
  { name: 'Imus (Aguinaldo Highway)', coords: [120.9405, 14.4296] as [number, number] },
  { name: 'General Trias (Cavite)', coords: [120.8808, 14.3879] as [number, number] },
  { name: 'Dasmariñas (Pala-Pala)', coords: [120.9367, 14.3294] as [number, number] },
  { name: 'Alabang Town Center (ATC)', coords: [121.0422, 14.4234] as [number, number] },
  { name: 'San Fernando, Pampanga', coords: [120.6840, 15.0345] as [number, number] },
];
