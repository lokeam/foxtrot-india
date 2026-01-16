-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    "serialNumber" TEXT UNIQUE NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "engineHours" INTEGER NOT NULL,
    "projectSite" TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    "lastInspectionAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS equipment_status_idx ON equipment(status);

-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    status TEXT NOT NULL,
    "engineHours" INTEGER NOT NULL,
    notes TEXT,
    "photoUrls" TEXT[] NOT NULL DEFAULT '{}',
    "inspectorName" TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("equipmentId") REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS inspections_equipmentId_idx ON inspections("equipmentId");
CREATE INDEX IF NOT EXISTS inspections_timestamp_idx ON inspections(timestamp);

-- Insert equipment data
INSERT INTO equipment (id, "serialNumber", make, model, status, "engineHours", "projectSite", latitude, longitude)
VALUES
    ('eq1', 'CAT-336-2019', 'Caterpillar', '336 Excavator', 'OPERATIONAL', 2847, 'Tampa Convention Center - Site B', 27.9506, -82.4572),
    ('eq2', 'CAT-D8T-2020', 'Caterpillar', 'D8T Dozer', 'NEEDS_SERVICE', 4523, 'Tampa Convention Center - Site B', 27.9512, -82.4568),
    ('eq3', 'JD-850K-2021', 'John Deere', '850K Crawler Dozer', 'OPERATIONAL', 3156, 'Tampa Convention Center - Site B', 27.9498, -82.4580),
    ('eq4', 'KOM-PC490-2018', 'Komatsu', 'PC490LC Excavator', 'NEEDS_SERVICE', 5892, 'Tampa Convention Center - Site B', 27.9515, -82.4565),
    ('eq5', 'VOL-EC380-2022', 'Volvo', 'EC380E Excavator', 'OPERATIONAL', 1234, 'Tampa Convention Center - Site B', 27.9502, -82.4575)
ON CONFLICT ("serialNumber") DO NOTHING;

-- Insert inspection data
INSERT INTO inspections (id, "equipmentId", status, "engineHours", notes, "photoUrls", "inspectorName", latitude, longitude, timestamp)
VALUES
    ('insp1', 'eq1', 'OPERATIONAL', 2847, 'All systems operational.', '{}', 'Jake Morrison', 27.9506, -82.4572, NOW() - INTERVAL '3 days'),
    ('insp2', 'eq2', 'NEEDS_SERVICE', 4523, 'Hydraulic leak detected.', '{}', 'Mike Chen', 27.9512, -82.4568, NOW() - INTERVAL '3 days'),
    ('insp3', 'eq3', 'OPERATIONAL', 3156, 'Excellent condition.', '{}', 'Sarah Williams', 27.9498, -82.4580, NOW() - INTERVAL '7 days'),
    ('insp4', 'eq4', 'NEEDS_SERVICE', 5892, 'Engine making unusual noise.', '{}', 'Jake Morrison', 27.9515, -82.4565, NOW() - INTERVAL '7 days'),
    ('insp5', 'eq5', 'OPERATIONAL', 1234, 'New equipment performing excellently.', '{}', 'Mike Chen', 27.9502, -82.4575, NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Update equipment with latest inspection data
UPDATE equipment SET
    "lastInspectionAt" = (
        SELECT timestamp FROM inspections
        WHERE inspections."equipmentId" = equipment.id
        ORDER BY timestamp DESC LIMIT 1
    ),
    status = (
        SELECT status FROM inspections
        WHERE inspections."equipmentId" = equipment.id
        ORDER BY timestamp DESC LIMIT 1
    ),
    "engineHours" = (
        SELECT "engineHours" FROM inspections
        WHERE inspections."equipmentId" = equipment.id
        ORDER BY timestamp DESC LIMIT 1
    );
