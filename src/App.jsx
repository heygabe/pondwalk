import { useState, useMemo } from 'react';
import { plantsData } from './plantsData';
import './App.css';

export default function App() {
  const [activePhotoId, setActivePhotoId] = useState(plantsData[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'stats'
  const [highlightedPlantName, setHighlightedPlantName] = useState(null);

  // Get unique list of plant types from data
  const allTypes = useMemo(() => {
    const types = new Set();
    plantsData.forEach(photo => {
      photo.plants.forEach(plant => {
        if (plant.type) types.add(plant.type);
      });
    });
    return Array.from(types).sort();
  }, []);

  // Filter photo data based on search term and filters
  const filteredPhotos = useMemo(() => {
    return plantsData.filter(photo => {
      // Search term matching
      const matchesSearch = searchTerm.trim() === '' || 
        photo.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.keyFeatures.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.plants.some(plant => 
          plant.commonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plant.scientificName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (plant.description && plant.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (plant.interestingFacts && plant.interestingFacts.some(fact => fact.toLowerCase().includes(searchTerm.toLowerCase())))
        );

      if (!matchesSearch) return false;

      // Status filtering (Native, Invasive, Introduced)
      const matchesStatus = statusFilter === 'all' || 
        photo.plants.some(plant => plant.status.toLowerCase() === statusFilter.toLowerCase());

      if (!matchesStatus) return false;

      // Type filtering (Tree, Shrub, Grass, etc.)
      const matchesType = typeFilter === 'all' || 
        photo.plants.some(plant => plant.type.toLowerCase() === typeFilter.toLowerCase());

      return matchesType;
    });
  }, [searchTerm, statusFilter, typeFilter]);

  // Adjust active photo ID if current active is filtered out
  const activePhoto = useMemo(() => {
    const found = filteredPhotos.find(p => p.id === activePhotoId);
    if (found) return found;
    return filteredPhotos.length > 0 ? filteredPhotos[0] : null;
  }, [filteredPhotos, activePhotoId]);

  // Handle next and previous navigation within filtered list
  const activeIndex = useMemo(() => {
    if (!activePhoto) return -1;
    return filteredPhotos.findIndex(p => p.id === activePhoto.id);
  }, [filteredPhotos, activePhoto]);

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActivePhotoId(filteredPhotos[activeIndex - 1].id);
      setHighlightedPlantName(null);
    }
  };

  const handleNext = () => {
    if (activeIndex < filteredPhotos.length - 1) {
      setActivePhotoId(filteredPhotos[activeIndex + 1].id);
      setHighlightedPlantName(null);
    }
  };

  // Compute walk statistics
  const stats = useMemo(() => {
    let totalPhotos = plantsData.length;
    let totalObservations = 0;
    const uniquePlantsMap = new Map(); // CommonName -> { scientificName, status, type, count: 0, photos: [] }
    let nativeCount = 0;
    let invasiveCount = 0;
    let introducedCount = 0;
    const typeCounts = {};

    plantsData.forEach(photo => {
      photo.plants.forEach(plant => {
        totalObservations++;
        
        // Track unique plants
        if (!uniquePlantsMap.has(plant.commonName)) {
          uniquePlantsMap.set(plant.commonName, {
            scientificName: plant.scientificName,
            status: plant.status,
            type: plant.type,
            count: 0,
            firstPhotoId: photo.id
          });
          
          // Update status counters based on unique species
          if (plant.status.toLowerCase() === 'native') nativeCount++;
          else if (plant.status.toLowerCase() === 'invasive') invasiveCount++;
          else if (plant.status.toLowerCase() === 'introduced') introducedCount++;

          // Update type counters
          typeCounts[plant.type] = (typeCounts[plant.type] || 0) + 1;
        }
        
        const existing = uniquePlantsMap.get(plant.commonName);
        existing.count++;
      });
    });

    const uniqueSpeciesList = Array.from(uniquePlantsMap.entries()).map(([commonName, info]) => ({
      commonName,
      ...info
    })).sort((a, b) => a.commonName.localeCompare(b.commonName));

    const totalUniqueSpecies = uniqueSpeciesList.length;

    // Percentages for radial chart
    const totalStatusUnique = nativeCount + invasiveCount + introducedCount;
    const nativePct = totalStatusUnique > 0 ? (nativeCount / totalStatusUnique) * 100 : 0;
    const invasivePct = totalStatusUnique > 0 ? (invasiveCount / totalStatusUnique) * 100 : 0;
    const introducedPct = totalStatusUnique > 0 ? (introducedCount / totalStatusUnique) * 100 : 0;

    return {
      totalPhotos,
      totalObservations,
      totalUniqueSpecies,
      uniqueSpeciesList,
      nativeCount,
      invasiveCount,
      introducedCount,
      nativePct,
      invasivePct,
      introducedPct,
      typeCounts
    };
  }, []);

  const selectUniquePlant = (plantName, firstPhotoId) => {
    setViewMode('gallery');
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setActivePhotoId(firstPhotoId);
    setHighlightedPlantName(plantName);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title-container">
            <span className="sidebar-title-icon">🌿</span>
            <h1 className="sidebar-title">Pond Walk Explorer</h1>
          </div>
          <p className="sidebar-subtitle">Botanical Identification & Trail Guide</p>
        </div>

        {/* View Selection Tab */}
        <div className="view-tabs">
          <div 
            className={`view-tab ${viewMode === 'gallery' ? 'active' : ''}`}
            onClick={() => setViewMode('gallery')}
          >
            🧭 Gallery View
          </div>
          <div 
            className={`view-tab ${viewMode === 'stats' ? 'active' : ''}`}
            onClick={() => setViewMode('stats')}
          >
            📈 Trail Stats
          </div>
        </div>

        {viewMode === 'gallery' && (
          <>
            {/* Search and Filters */}
            <div className="search-filter-section">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  className="search-input"
                  placeholder="Search plants, facts, photos..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filters-wrapper">
                <div className="filter-label">Conservation Status</div>
                <div className="chips-container">
                  <span 
                    className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All
                  </span>
                  <span 
                    className={`chip ${statusFilter === 'native' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('native')}
                  >
                    Native
                  </span>
                  <span 
                    className={`chip ${statusFilter === 'invasive' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('invasive')}
                  >
                    Invasive
                  </span>
                  <span 
                    className={`chip ${statusFilter === 'introduced' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('introduced')}
                  >
                    Introduced
                  </span>
                </div>
              </div>

              <div className="filters-wrapper">
                <div className="filter-label">Plant Group</div>
                <div className="chips-container">
                  <span 
                    className={`chip ${typeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setTypeFilter('all')}
                  >
                    All
                  </span>
                  {allTypes.map(type => (
                    <span 
                      key={type}
                      className={`chip ${typeFilter === type ? 'active' : ''}`}
                      onClick={() => setTypeFilter(type)}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* List of Photos */}
            <div className="photo-list">
              {filteredPhotos.length > 0 ? (
                filteredPhotos.map(photo => {
                  const isActive = activePhoto && photo.id === activePhoto.id;
                  const hasNative = photo.plants.some(p => p.status.toLowerCase() === 'native');
                  const hasInvasive = photo.plants.some(p => p.status.toLowerCase() === 'invasive');
                  const hasIntroduced = photo.plants.some(p => p.status.toLowerCase() === 'introduced');
                  
                  return (
                    <div 
                      key={photo.id}
                      className={`photo-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setActivePhotoId(photo.id);
                        setHighlightedPlantName(null);
                      }}
                    >
                      <div className="item-thumbnail-container">
                        <img 
                          src={photo.imagePath} 
                          alt={photo.filename} 
                          className="item-thumbnail" 
                        />
                      </div>
                      <div className="item-info">
                        <h3 className="item-filename">{photo.filename}</h3>
                        <p className="item-plants-count">
                          {photo.plants.length} {photo.plants.length === 1 ? 'Plant' : 'Plants'} identified
                        </p>
                        <div className="item-badges">
                          {hasNative && <span className="badge-micro native">Native</span>}
                          {hasInvasive && <span className="badge-micro invasive">Invasive</span>}
                          {hasIntroduced && <span className="badge-micro introduced">Introduced</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-results">
                  <span className="no-results-icon">🍃</span>
                  <p>No photos match your filter criteria.</p>
                  <button 
                    className="chip active" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {viewMode === 'stats' && (
          <div className="photo-list">
            <div className="filter-label" style={{ padding: '0 8px 8px' }}>Observation Checklist</div>
            <div className="glossary-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'none' }}>
              {stats.uniqueSpeciesList.map(plant => (
                <div 
                  key={plant.commonName}
                  className="glossary-item"
                  onClick={() => selectUniquePlant(plant.commonName, plant.firstPhotoId)}
                >
                  <div className="glossary-common">{plant.commonName}</div>
                  <div className="glossary-scientific">{plant.scientificName}</div>
                  <div className="item-badges" style={{ marginTop: '4px' }}>
                    <span className={`badge-micro ${plant.status.toLowerCase()}`}>{plant.status}</span>
                    <span className="badge-micro type">{plant.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {viewMode === 'gallery' ? (
          activePhoto ? (
            <div className="stats-view-container fade-in-element" key={activePhoto.id}>
              {/* Header */}
              <div className="content-header">
                <div className="photo-title-area">
                  <h2 className="photo-title">{activePhoto.filename}</h2>
                  <p className="photo-subtitle">Pond Walk Location Reference</p>
                </div>

                <div className="photo-nav-controls">
                  <button 
                    className="nav-button" 
                    onClick={handlePrev}
                    disabled={activeIndex <= 0}
                    title="Previous Photo"
                  >
                    ◀
                  </button>
                  <span className="photo-counter">
                    {activeIndex + 1} of {filteredPhotos.length}
                  </span>
                  <button 
                    className="nav-button" 
                    onClick={handleNext}
                    disabled={activeIndex >= filteredPhotos.length - 1}
                    title="Next Photo"
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Grid Layout: Image on Left, Metadata on Right */}
              <div className="photo-display-grid">
                <div className="image-viewer-card">
                  <div className="image-container">
                    <img 
                      src={activePhoto.imagePath} 
                      alt={activePhoto.filename} 
                      className="large-photo"
                    />
                    <div className="img-overlay-hint">🔎 Hover to zoom</div>
                  </div>
                </div>

                <div className="photo-meta-card">
                  <div>
                    <h3 className="meta-section-title">Key Observations</h3>
                    <div className="features-box">
                      <p className="features-text">{activePhoto.keyFeatures}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="meta-section-title">Identified Species</h3>
                    <div className="photo-plants-checklist">
                      {activePhoto.plants.map(plant => (
                        <div 
                          key={plant.commonName}
                          className={`plant-badge-item ${highlightedPlantName === plant.commonName ? 'active' : ''}`}
                          onClick={() => {
                            setHighlightedPlantName(plant.commonName);
                            document.getElementById(`plant-${plant.commonName.replace(/\s+/g, '-')}`)?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <div className="badge-left">
                            <span className="badge-common-name">{plant.commonName}</span>
                            <span className="badge-scientific-name">{plant.scientificName}</span>
                          </div>
                          <span className={`badge-micro ${plant.status.toLowerCase()}`}>{plant.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <a 
                      href={activePhoto.imagePath} 
                      target="_blank" 
                      rel="noreferrer"
                      className="chip active"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', width: '100%', justifyContent: 'center', padding: '12px' }}
                    >
                      🖼️ Open Original High-Res Image
                    </a>
                  </div>
                </div>
              </div>

              {/* Plant Detail Section */}
              <div className="plant-details-list">
                {activePhoto.plants.map(plant => {
                  const isHighlighted = highlightedPlantName === plant.commonName;
                  return (
                    <div 
                      key={plant.commonName}
                      id={`plant-${plant.commonName.replace(/\s+/g, '-')}`}
                      className={`plant-detail-card ${isHighlighted ? 'active' : ''}`}
                      style={isHighlighted ? { borderColor: 'var(--accent-mint)', boxShadow: '0 0 20px rgba(52, 211, 153, 0.2)' } : {}}
                    >
                      <div className={`card-decor-accent ${plant.status.toLowerCase()}`} />
                      <div className="plant-card-header">
                        <div className="plant-card-names">
                          <h3 className="plant-common-title">{plant.commonName}</h3>
                          <p className="plant-card-scientific plant-scientific-title">{plant.scientificName}</p>
                        </div>
                        <div className="plant-card-badges">
                          <span className={`tag-badge ${plant.status.toLowerCase()}`}>{plant.status}</span>
                          <span className="tag-badge type">{plant.type}</span>
                        </div>
                      </div>

                      <div className="plant-description-block">
                        <p className="plant-description-text">{plant.description}</p>
                      </div>

                      {plant.interestingFacts && plant.interestingFacts.length > 0 && (
                        <div className="plant-facts-block">
                          <div className="facts-title-container">
                            <span className="facts-title-icon">💡</span>
                            <h4 className="facts-title">Interesting Facts</h4>
                          </div>
                          <ul className="facts-list">
                            {plant.interestingFacts.map((fact, idx) => (
                              <li key={idx} className="fact-item">{fact}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="no-results" style={{ margin: 'auto' }}>
              <span className="no-results-icon">🕵️</span>
              <h2>No Matching Photos</h2>
              <p>Try resetting the search terms or filters on the left side panel.</p>
              <button 
                className="chip active" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
              >
                Clear Search & Filters
              </button>
            </div>
          )
        ) : (
          /* Statistics / Walk Overview Page */
          <div className="stats-view-container fade-in-element">
            <div className="content-header">
              <div className="photo-title-area">
                <h2 className="photo-title">Pond Walk Statistics</h2>
                <p className="photo-subtitle">Species breakdown and ecological analysis</p>
              </div>
            </div>

            {/* Top Cards Grid */}
            <div className="stats-grid-top">
              <div className="stat-counter-card">
                <span className="stat-number">{stats.totalPhotos}</span>
                <span className="stat-label">Photo Locations</span>
              </div>
              <div className="stat-counter-card">
                <span className="stat-number">{stats.totalObservations}</span>
                <span className="stat-label">Plant Observations</span>
              </div>
              <div className="stat-counter-card">
                <span className="stat-number">{stats.totalUniqueSpecies}</span>
                <span className="stat-label">Unique Species</span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="stats-charts-section">
              {/* Species Conservation breakdown */}
              <div className="chart-card">
                <h3 className="chart-title">Conservation Status (By Unique Species)</h3>
                
                <div className="donut-chart-container">
                  <div 
                    className="radial-indicator"
                    style={{
                      '--native-pct': `${stats.nativePct}%`,
                      '--invasive-pct': `${stats.nativePct + stats.invasivePct}%`
                    }}
                  >
                    <div className="radial-indicator-inner">
                      <span className="radial-inner-title">Unique</span>
                      <span className="radial-inner-value">{stats.totalUniqueSpecies}</span>
                      <span className="radial-inner-title">Species</span>
                    </div>
                  </div>

                  <div className="donut-legend">
                    <div className="legend-item">
                      <span className="legend-color-box native" />
                      <span className="legend-text">Native</span>
                      <span className="legend-pct">
                        {stats.nativeCount} species ({Math.round(stats.nativePct)}%)
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color-box invasive" />
                      <span className="legend-text">Invasive</span>
                      <span className="legend-pct">
                        {stats.invasiveCount} species ({Math.round(stats.invasivePct)}%)
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color-box introduced" />
                      <span className="legend-text">Introduced</span>
                      <span className="legend-pct">
                        {stats.introducedCount} species ({Math.round(stats.introducedPct)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plant Type Breakdown */}
              <div className="chart-card">
                <h3 className="chart-title">Plant Group Distribution</h3>
                <div className="bar-chart-container">
                  {Object.entries(stats.typeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const percentage = (count / stats.totalUniqueSpecies) * 100;
                      return (
                        <div key={type} className="chart-row">
                          <div className="chart-row-labels">
                            <span className="chart-row-name">{type}</span>
                            <span className="chart-row-value">{count} species</span>
                          </div>
                          <div className="chart-bar-bg">
                            <div 
                              className="chart-bar-fill" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: 'var(--accent-emerald)'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Comprehensive List Card */}
              <div className="chart-card glossary-card">
                <h3 className="chart-title">Click a Species to Locate on Trail Map</h3>
                <p className="photo-subtitle" style={{ margin: '0 0 10px' }}>
                  Clicking any species below will automatically filter the gallery and display the first photograph where it was cataloged.
                </p>
                <div className="glossary-grid">
                  {stats.uniqueSpeciesList.map(plant => (
                    <div 
                      key={plant.commonName}
                      className="glossary-item"
                      onClick={() => selectUniquePlant(plant.commonName, plant.firstPhotoId)}
                    >
                      <span className="glossary-common">{plant.commonName}</span>
                      <span className="glossary-scientific">{plant.scientificName}</span>
                      <div className="item-badges" style={{ marginTop: '6px' }}>
                        <span className={`badge-micro ${plant.status.toLowerCase()}`}>{plant.status}</span>
                        <span className="badge-micro type">{plant.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
