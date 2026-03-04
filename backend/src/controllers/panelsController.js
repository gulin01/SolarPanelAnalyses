// In-memory store — replace with a real DB layer as needed
let panels = [
  { id: 1, name: 'Panel A', location: 'Roof North', capacity_kw: 5.0, installed_at: '2022-01-15' },
  { id: 2, name: 'Panel B', location: 'Roof South', capacity_kw: 7.5, installed_at: '2023-03-10' },
];
let nextId = 3;

exports.listPanels = (_req, res) => res.json(panels);

exports.getPanel = (req, res) => {
  const panel = panels.find((p) => p.id === Number(req.params.id));
  if (!panel) return res.status(404).json({ error: 'Panel not found' });
  res.json(panel);
};

exports.createPanel = (req, res) => {
  const { name, location, capacity_kw, installed_at } = req.body;
  if (!name || !location || capacity_kw == null) {
    return res.status(400).json({ error: 'name, location, and capacity_kw are required' });
  }
  const panel = { id: nextId++, name, location, capacity_kw, installed_at: installed_at || new Date().toISOString().slice(0, 10) };
  panels.push(panel);
  res.status(201).json(panel);
};

exports.updatePanel = (req, res) => {
  const idx = panels.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Panel not found' });
  panels[idx] = { ...panels[idx], ...req.body, id: panels[idx].id };
  res.json(panels[idx]);
};

exports.deletePanel = (req, res) => {
  const idx = panels.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Panel not found' });
  panels.splice(idx, 1);
  res.status(204).send();
};
