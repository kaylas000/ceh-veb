CREATE TABLE design_genomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id VARCHAR(50) NOT NULL,
    project_name VARCHAR(100),
    button_id VARCHAR(50),
    icon_set_id VARCHAR(50),
    illustration_style_id VARCHAR(50),
    color_harmony_type VARCHAR(30),
    full_genome_json TEXT,
    created_at DATETIME
);
CREATE INDEX idx_genome_lookup ON design_genomes(button_id, icon_set_id, illustration_style_id);
