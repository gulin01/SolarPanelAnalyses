// Stub analytics — wire up to real data source as needed
const mockReadings = [
  { panel_id: 1, date: '2024-01-01', energy_kwh: 22.4, efficiency: 0.87 },
  { panel_id: 1, date: '2024-01-02', energy_kwh: 19.1, efficiency: 0.82 },
  { panel_id: 2, date: '2024-01-01', energy_kwh: 33.7, efficiency: 0.91 },
  { panel_id: 2, date: '2024-01-02', energy_kwh: 30.5, efficiency: 0.88 },
];

exports.getSummary = (_req, res) => {
  const totalEnergy = mockReadings.reduce((sum, r) => sum + r.energy_kwh, 0);
  const avgEfficiency = mockReadings.reduce((sum, r) => sum + r.efficiency, 0) / mockReadings.length;
  res.json({ total_energy_kwh: totalEnergy, average_efficiency: avgEfficiency.toFixed(3) });
};

exports.getEnergyOutput = (_req, res) => {
  const byDate = mockReadings.reduce((acc, r) => {
    acc[r.date] = (acc[r.date] || 0) + r.energy_kwh;
    return acc;
  }, {});
  res.json(Object.entries(byDate).map(([date, energy_kwh]) => ({ date, energy_kwh })));
};

exports.getEfficiency = (_req, res) => {
  res.json(mockReadings.map(({ panel_id, date, efficiency }) => ({ panel_id, date, efficiency })));
};
