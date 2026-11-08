export interface LuzonTown {
  name: string;
  province: string;
  label: string;
  coordinates: [number, number]; // [lng, lat]
}

export const LUZON_TOWNS: LuzonTown[] = [
  // Bulacan
  { name: 'Malolos City', province: 'Bulacan', label: 'Malolos City, Bulacan (City Hall)', coordinates: [120.8113, 14.8527] },
  { name: 'Bocaue', province: 'Bulacan', label: 'Bocaue, Bulacan (Town Center)', coordinates: [120.9482, 14.7736] },
  { name: 'Marilao', province: 'Bulacan', label: 'Marilao, Bulacan (Town Center)', coordinates: [120.9485, 14.7578] },
  { name: 'Meycauayan City', province: 'Bulacan', label: 'Meycauayan City, Bulacan (City Hall)', coordinates: [120.9610, 14.7350] },
  { name: 'Guiguinto', province: 'Bulacan', label: 'Guiguinto, Bulacan (Town Center)', coordinates: [120.8760, 14.8320] },
  { name: 'Balagtas', province: 'Bulacan', label: 'Balagtas, Bulacan (Town Center)', coordinates: [120.9080, 14.8160] },
  { name: 'Calumpit', province: 'Bulacan', label: 'Calumpit, Bulacan (Town Center)', coordinates: [120.7640, 14.9150] },
  { name: 'Pulilan', province: 'Bulacan', label: 'Pulilan, Bulacan (Town Center)', coordinates: [120.8500, 14.9010] },
  { name: 'Baliwag City', province: 'Bulacan', label: 'Baliwag City, Bulacan (City Hall)', coordinates: [120.9020, 14.9540] },
  { name: 'Plaridel', province: 'Bulacan', label: 'Plaridel, Bulacan (Town Center)', coordinates: [120.8600, 14.8870] },
  { name: 'San Jose del Monte City', province: 'Bulacan', label: 'San Jose del Monte, Bulacan (City Hall)', coordinates: [121.0450, 14.8130] },
  { name: 'Santa Maria', province: 'Bulacan', label: 'Santa Maria, Bulacan (Town Center)', coordinates: [120.9600, 14.8190] },
  { name: 'Norzagaray', province: 'Bulacan', label: 'Norzagaray, Bulacan (Town Center)', coordinates: [121.0450, 14.9150] },
  { name: 'Hagonoy', province: 'Bulacan', label: 'Hagonoy, Bulacan (Town Center)', coordinates: [120.7330, 14.8330] },
  { name: 'Paombong', province: 'Bulacan', label: 'Paombong, Bulacan (Town Center)', coordinates: [120.7850, 14.8350] },
  { name: 'Angat', province: 'Bulacan', label: 'Angat, Bulacan (Town Center)', coordinates: [121.0280, 14.9310] },
  { name: 'Bustos', province: 'Bulacan', label: 'Bustos, Bulacan (Town Center)', coordinates: [120.9120, 14.9280] },
  { name: 'San Ildefonso', province: 'Bulacan', label: 'San Ildefonso, Bulacan (Town Center)', coordinates: [120.9400, 15.0780] },
  { name: 'San Miguel', province: 'Bulacan', label: 'San Miguel, Bulacan (Town Center)', coordinates: [120.9750, 15.1430] },

  // Metro Manila
  { name: 'City of Manila', province: 'Metro Manila', label: 'Manila (City Hall / Rizal Park)', coordinates: [120.9820, 14.5900] },
  { name: 'Quezon City', province: 'Metro Manila', label: 'Quezon City (City Hall / Elliptical Road)', coordinates: [121.0495, 14.6465] },
  { name: 'Makati City', province: 'Metro Manila', label: 'Makati City (Ayala Center / City Hall)', coordinates: [121.0286, 14.5503] },
  { name: 'Taguig City (BGC)', province: 'Metro Manila', label: 'Taguig City (BGC / Bonifacio High St)', coordinates: [121.0500, 14.5500] },
  { name: 'Pasig City', province: 'Metro Manila', label: 'Pasig City (City Hall / Ortigas)', coordinates: [121.0800, 14.5580] },
  { name: 'Mandaluyong City', province: 'Metro Manila', label: 'Mandaluyong City (City Hall / EDSA)', coordinates: [121.0340, 14.5790] },
  { name: 'San Juan City', province: 'Metro Manila', label: 'San Juan City (Greenhills / City Hall)', coordinates: [121.0320, 14.6020] },
  { name: 'Caloocan City', province: 'Metro Manila', label: 'Caloocan City (Monumento / City Hall)', coordinates: [120.9837, 14.6542] },
  { name: 'Malabon City', province: 'Metro Manila', label: 'Malabon City (City Hall / Hulong Duhat)', coordinates: [120.9560, 14.6620] },
  { name: 'Navotas City', province: 'Metro Manila', label: 'Navotas City (City Hall)', coordinates: [120.9500, 14.6570] },
  { name: 'Valenzuela City', province: 'Metro Manila', label: 'Valenzuela City (City Hall / McArthur)', coordinates: [120.9600, 14.7000] },
  { name: 'Pasay City', province: 'Metro Manila', label: 'Pasay City (Mall of Asia / City Hall)', coordinates: [120.9822, 14.5354] },
  { name: 'Parañaque City', province: 'Metro Manila', label: 'Parañaque City (Aseana / City Hall)', coordinates: [120.9897, 14.5240] },
  { name: 'Las Piñas City', province: 'Metro Manila', label: 'Las Piñas City (City Hall / Alabang-Zapote)', coordinates: [120.9820, 14.4480] },
  { name: 'Muntinlupa City', province: 'Metro Manila', label: 'Muntinlupa City (Alabang / ATC)', coordinates: [121.0422, 14.4234] },
  { name: 'Marikina City', province: 'Metro Manila', label: 'Marikina City (City Hall / Riverbanks)', coordinates: [121.0960, 14.6500] },
  { name: 'Pateros', province: 'Metro Manila', label: 'Pateros (Municipal Hall)', coordinates: [121.0680, 14.5450] },

  // Cavite
  { name: 'General Trias City', province: 'Cavite', label: 'General Trias, Cavite (City Hall)', coordinates: [120.8808, 14.3879] },
  { name: 'Bacoor City', province: 'Cavite', label: 'Bacoor City, Cavite (City Hall / Longos)', coordinates: [120.9427, 14.4642] },
  { name: 'Imus City', province: 'Cavite', label: 'Imus City, Cavite (City Hall)', coordinates: [120.9405, 14.4296] },
  { name: 'Dasmariñas City', province: 'Cavite', label: 'Dasmariñas City, Cavite (City Hall)', coordinates: [120.9360, 14.3260] },
  { name: 'Tagaytay City', province: 'Cavite', label: 'Tagaytay City, Cavite (City Hall / Ridge)', coordinates: [120.9620, 14.1150] },
  { name: 'Silang', province: 'Cavite', label: 'Silang, Cavite (Town Center)', coordinates: [120.9740, 14.2300] },
  { name: 'Kawit', province: 'Cavite', label: 'Kawit, Cavite (Aguinaldo Shrine / Town)', coordinates: [120.9020, 14.4440] },
  { name: 'Noveleta', province: 'Cavite', label: 'Noveleta, Cavite (Town Center)', coordinates: [120.8780, 14.4280] },
  { name: 'Rosario', province: 'Cavite', label: 'Rosario, Cavite (EPZA / Town Center)', coordinates: [120.8580, 14.4150] },
  { name: 'Tanza', province: 'Cavite', label: 'Tanza, Cavite (Town Center)', coordinates: [120.8550, 14.3940] },
  { name: 'Trece Martires City', province: 'Cavite', label: 'Trece Martires City, Cavite (Provincial Capitol)', coordinates: [120.8670, 14.2830] },
  { name: 'Naic', province: 'Cavite', label: 'Naic, Cavite (Town Center)', coordinates: [120.7670, 14.3180] },
  { name: 'Carmona City', province: 'Cavite', label: 'Carmona City, Cavite (City Hall)', coordinates: [121.0560, 14.3160] },

  // Laguna
  { name: 'Biñan City', province: 'Laguna', label: 'Biñan City, Laguna (City Hall)', coordinates: [121.0810, 14.3410] },
  { name: 'Santa Rosa City', province: 'Laguna', label: 'Santa Rosa City, Laguna (Nuvali / City Hall)', coordinates: [121.1110, 14.3120] },
  { name: 'Cabuyao City', province: 'Laguna', label: 'Cabuyao City, Laguna (City Hall)', coordinates: [121.1240, 14.2780] },
  { name: 'Calamba City', province: 'Laguna', label: 'Calamba City, Laguna (City Hall / Real)', coordinates: [121.1570, 14.2120] },
  { name: 'San Pedro City', province: 'Laguna', label: 'San Pedro City, Laguna (City Hall)', coordinates: [121.0500, 14.3590] },
  { name: 'Los Baños', province: 'Laguna', label: 'Los Baños, Laguna (UPLB / Town Center)', coordinates: [121.2220, 14.1750] },
  { name: 'San Pablo City', province: 'Laguna', label: 'San Pablo City, Laguna (City Hall)', coordinates: [121.3250, 14.0680] },
  { name: 'Santa Cruz', province: 'Laguna', label: 'Santa Cruz, Laguna (Provincial Capitol)', coordinates: [121.4170, 14.2800] },
  { name: 'Pagsanjan', province: 'Laguna', label: 'Pagsanjan, Laguna (Town Plaza)', coordinates: [121.4550, 14.2750] },
  { name: 'Bay', province: 'Laguna', label: 'Bay, Laguna (Town Center)', coordinates: [121.2850, 14.1800] },

  // Pampanga
  { name: 'San Fernando City', province: 'Pampanga', label: 'City of San Fernando, Pampanga (Capitol / City Hall)', coordinates: [120.6890, 15.0310] },
  { name: 'Angeles City', province: 'Pampanga', label: 'Angeles City, Pampanga (City Hall / Balibago)', coordinates: [120.5890, 15.1380] },
  { name: 'Clark Freeport', province: 'Pampanga', label: 'Clark Freeport Zone, Pampanga (Parade Grounds)', coordinates: [120.5300, 15.1850] },
  { name: 'Mabalacat City', province: 'Pampanga', label: 'Mabalacat City, Pampanga (City Hall)', coordinates: [120.5720, 15.2200] },
  { name: 'Guagua', province: 'Pampanga', label: 'Guagua, Pampanga (Town Center)', coordinates: [120.6340, 14.9660] },
  { name: 'Lubao', province: 'Pampanga', label: 'Lubao, Pampanga (Town Center)', coordinates: [120.5980, 14.9400] },
  { name: 'Mexico', province: 'Pampanga', label: 'Mexico, Pampanga (Town Center)', coordinates: [120.7200, 15.0660] },
  { name: 'Bacolor', province: 'Pampanga', label: 'Bacolor, Pampanga (Historic Plaza)', coordinates: [120.6480, 14.9980] },
  { name: 'Apalit', province: 'Pampanga', label: 'Apalit, Pampanga (Town Center)', coordinates: [120.7600, 14.9500] },
  { name: 'Porac', province: 'Pampanga', label: 'Porac, Pampanga (Town Center)', coordinates: [120.5420, 15.0700] },

  // Batangas
  { name: 'Batangas City', province: 'Batangas', label: 'Batangas City, Batangas (City Hall / Port)', coordinates: [121.0580, 13.7560] },
  { name: 'Lipa City', province: 'Batangas', label: 'Lipa City, Batangas (City Hall / Marawoy)', coordinates: [121.1630, 13.9410] },
  { name: 'Tanauan City', province: 'Batangas', label: 'Tanauan City, Batangas (City Hall)', coordinates: [121.1510, 14.0860] },
  { name: 'Santo Tomas City', province: 'Batangas', label: 'Santo Tomas City, Batangas (City Hall)', coordinates: [121.1820, 14.1100] },
  { name: 'Malvar', province: 'Batangas', label: 'Malvar, Batangas (Town Center)', coordinates: [121.1580, 14.0450] },
  { name: 'Nasugbu', province: 'Batangas', label: 'Nasugbu, Batangas (Town Plaza)', coordinates: [120.6320, 14.0770] },
  { name: 'Balayan', province: 'Batangas', label: 'Balayan, Batangas (Town Center)', coordinates: [120.7330, 13.9330] },
  { name: 'Lemery', province: 'Batangas', label: 'Lemery, Batangas (Town Center)', coordinates: [120.8950, 13.9180] },
  { name: 'Bauan', province: 'Batangas', label: 'Bauan, Batangas (Town Plaza)', coordinates: [121.0100, 13.7920] },

  // Rizal
  { name: 'Antipolo City', province: 'Rizal', label: 'Antipolo City, Rizal (City Hall / Cathedral)', coordinates: [121.1760, 14.5870] },
  { name: 'Cainta', province: 'Rizal', label: 'Cainta, Rizal (Town Center / Junction)', coordinates: [121.1210, 14.5780] },
  { name: 'Taytay', province: 'Rizal', label: 'Taytay, Rizal (Town Center / Club Manila)', coordinates: [121.1330, 14.5680] },
  { name: 'Angono', province: 'Rizal', label: 'Angono, Rizal (Town Plaza / Art Capital)', coordinates: [121.1550, 14.5250] },
  { name: 'Binangonan', province: 'Rizal', label: 'Binangonan, Rizal (Town Center)', coordinates: [121.1920, 14.4640] },
  { name: 'San Mateo', province: 'Rizal', label: 'San Mateo, Rizal (Town Plaza)', coordinates: [121.1180, 14.6960] },
  { name: 'Rodriguez', province: 'Rizal', label: 'Rodriguez (Montalban), Rizal (Town Center)', coordinates: [121.1440, 14.7300] },
  { name: 'Tanay', province: 'Rizal', label: 'Tanay, Rizal (Town Center)', coordinates: [121.2850, 14.4980] },

  // Tarlac
  { name: 'Tarlac City', province: 'Tarlac', label: 'Tarlac City, Tarlac (Plaza / City Hall)', coordinates: [120.5900, 15.4850] },
  { name: 'Capas', province: 'Tarlac', label: 'Capas, Tarlac (Town Plaza)', coordinates: [120.5920, 15.3340] },
  { name: 'Concepcion', province: 'Tarlac', label: 'Concepcion, Tarlac (Town Center)', coordinates: [120.6550, 15.3240] },
  { name: 'Bamban', province: 'Tarlac', label: 'Bamban, Tarlac (Town Center)', coordinates: [120.5700, 15.2800] },
  { name: 'Gerona', province: 'Tarlac', label: 'Gerona, Tarlac (Town Center)', coordinates: [120.6000, 15.6050] },
  { name: 'Paniqui', province: 'Tarlac', label: 'Paniqui, Tarlac (Town Plaza)', coordinates: [120.5820, 15.6660] },

  // Nueva Ecija
  { name: 'Cabanatuan City', province: 'Nueva Ecija', label: 'Cabanatuan City, Nueva Ecija (City Hall)', coordinates: [120.9680, 15.4860] },
  { name: 'Gapan City', province: 'Nueva Ecija', label: 'Gapan City, Nueva Ecija (City Hall)', coordinates: [120.9480, 15.3090] },
  { name: 'San Jose City', province: 'Nueva Ecija', label: 'San Jose City, Nueva Ecija (City Hall)', coordinates: [120.9850, 15.7910] },
  { name: 'Palayan City', province: 'Nueva Ecija', label: 'Palayan City, Nueva Ecija (Provincial Capitol)', coordinates: [121.0840, 15.5410] },
  { name: 'Talavera', province: 'Nueva Ecija', label: 'Talavera, Nueva Ecija (Town Plaza)', coordinates: [120.9190, 15.5840] },

  // Bataan & Zambales
  { name: 'Balanga City', province: 'Bataan', label: 'Balanga City, Bataan (Plaza Mayor / City Hall)', coordinates: [120.5400, 14.6780] },
  { name: 'Dinalupihan', province: 'Bataan', label: 'Dinalupihan, Bataan (Town Center)', coordinates: [120.4630, 14.8670] },
  { name: 'Hermosa', province: 'Bataan', label: 'Hermosa, Bataan (Town Center)', coordinates: [120.5050, 14.8320] },
  { name: 'Orani', province: 'Bataan', label: 'Orani, Bataan (Town Plaza)', coordinates: [120.5360, 14.7990] },
  { name: 'Mariveles', province: 'Bataan', label: 'Mariveles, Bataan (Town Center / Freeport)', coordinates: [120.4850, 14.4330] },
  { name: 'Olongapo City', province: 'Zambales', label: 'Olongapo City, Zambales (City Hall / Rizal Ave)', coordinates: [120.2830, 14.8380] },
  { name: 'Subic', province: 'Zambales', label: 'Subic, Zambales (Town Plaza)', coordinates: [120.2330, 14.8800] },

  // Pangasinan & Benguet
  { name: 'Dagupan City', province: 'Pangasinan', label: 'Dagupan City, Pangasinan (City Plaza / Hall)', coordinates: [120.3340, 16.0430] },
  { name: 'Urdaneta City', province: 'Pangasinan', label: 'Urdaneta City, Pangasinan (City Hall / MacArthur)', coordinates: [120.5710, 15.9760] },
  { name: 'San Carlos City', province: 'Pangasinan', label: 'San Carlos City, Pangasinan (City Hall)', coordinates: [120.3490, 15.9280] },
  { name: 'Lingayen', province: 'Pangasinan', label: 'Lingayen, Pangasinan (Provincial Capitol)', coordinates: [120.2320, 16.0230] },
  { name: 'Baguio City', province: 'Benguet', label: 'Baguio City, Benguet (City Hall / Burnham)', coordinates: [120.5960, 16.4120] },
  { name: 'La Trinidad', province: 'Benguet', label: 'La Trinidad, Benguet (Municipal Hall)', coordinates: [120.5890, 16.4550] },

  // Quezon
  { name: 'Lucena City', province: 'Quezon', label: 'Lucena City, Quezon (City Hall / Capitol)', coordinates: [121.6170, 13.9370] },
  { name: 'Tayabas City', province: 'Quezon', label: 'Tayabas City, Quezon (Basilica / City Hall)', coordinates: [121.5930, 14.0260] },
  { name: 'Sariaya', province: 'Quezon', label: 'Sariaya, Quezon (Town Plaza)', coordinates: [121.5260, 13.9640] },
  { name: 'Candelaria', province: 'Quezon', label: 'Candelaria, Quezon (Town Center)', coordinates: [121.4240, 13.9310] },
  { name: 'Tiaong', province: 'Quezon', label: 'Tiaong, Quezon (Town Center)', coordinates: [121.3250, 13.9620] },
];
