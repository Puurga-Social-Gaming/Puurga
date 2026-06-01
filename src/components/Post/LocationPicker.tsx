import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; name: string }) => void;
  onClose: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      
      if (data[0]) {
        onLocationSelect({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name
        });
        onClose();
      } else {
        setError('Location not found');
      }
    } catch (error) {
      setError('Failed to search location');
      console.error('Location search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-modal">
      <div className="bg-card rounded-xl w-full max-w-md mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add Location</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location..."
              className="flex-1 bg-input text-foreground rounded-lg px-4 py-2 border border-input-border"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-accent text-black rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : <Search size={20} />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
