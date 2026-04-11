import { useState } from "react";
import { mockHotels, Hotel } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Star, Search, Pencil, Trash2, MapPin, BedDouble, Wifi, UtensilsCrossed, Car, Dumbbell, Filter, SlidersHorizontal, Grid3X3, List, ChevronDown, X, Heart, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop",
];

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  WiFi: Wifi,
  "Free WiFi": Wifi,
  Restaurant: UtensilsCrossed,
  Parking: Car,
  Gym: Dumbbell,
  Pool: BedDouble,
};

const FILTER_OPTIONS = [
  { id: "freeBreakfast", label: "Free breakfast" },
  { id: "freeCancellation", label: "Free cancellation" },
  { id: "star4plus", label: "Star Rating: 4+" },
  { id: "under200", label: "Under $200/night" },
];

export default function HotelsPage() {
  const { currentRole } = useRole();
  const [hotels, setHotels] = useState(mockHotels);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [form, setForm] = useState<{ name: string; city: string; country: string; starRating: number; pricePerNight: number; rooms: number; amenities: string[]; status: 'active' | 'inactive' }>({ name: '', city: '', country: '', starRating: 4, pricePerNight: 0, rooms: 0, amenities: [], status: 'active' });
  const [amenityInput, setAmenityInput] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'rating' | 'name'>('rating');

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';

  const filtered = hotels.filter(h => {
    const matchSearch = h.name.toLowerCase().includes(search.toLowerCase()) || h.city.toLowerCase().includes(search.toLowerCase());
    const matchStar = activeFilters.includes('star4plus') ? h.starRating >= 4 : true;
    const matchPrice = activeFilters.includes('under200') ? h.pricePerNight < 200 : true;
    const matchStarFilter = starFilter ? h.starRating === starFilter : true;
    return matchSearch && matchStar && matchPrice && matchStarFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.pricePerNight - b.pricePerNight;
      case 'price-high': return b.pricePerNight - a.pricePerNight;
      case 'rating': return b.starRating - a.starRating;
      case 'name': return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  const openAdd = () => { setEditing(null); setForm({ name: '', city: '', country: '', starRating: 4, pricePerNight: 0, rooms: 0, amenities: [], status: 'active' as const }); setDialogOpen(true); };
  const openEdit = (h: Hotel) => { setEditing(h); setForm(h); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name) { toast.error("Hotel name is required"); return; }
    if (editing) {
      setHotels(prev => prev.map(h => h.hotelId === editing.hotelId ? { ...h, ...form } : h));
      toast.success("Hotel updated");
    } else {
      setHotels(prev => [...prev, { ...form, hotelId: `h${Date.now()}` }]);
      toast.success("Hotel added");
    }
    setDialogOpen(false);
  };

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const getHotelImage = (index: number) => HOTEL_IMAGES[index % HOTEL_IMAGES.length];
  const getReviewScore = (stars: number) => (6 + stars * 0.7).toFixed(1);
  const getReviewLabel = (stars: number) => stars >= 5 ? "Exceptional" : stars >= 4 ? "Excellent" : stars >= 3 ? "Very Good" : "Good";
  const getReviewCount = (index: number) => [1247, 856, 2103, 634, 1891, 423][index % 6];

  return (
    <div className="space-y-0 animate-fade-in -m-4 md:-m-6">
      {/* Hero Search Banner - Agoda Style */}
      <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.8)] px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-primary-foreground mb-1">
            Hotel Management
          </h1>
          <p className="text-primary-foreground/70 text-sm mb-5">
            Manage your hotel inventory and availability
          </p>

          {/* Search Bar */}
          <div className="bg-card rounded-xl shadow-elevated p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by hotel name, city, or country..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-12 text-base border-2 focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[160px] h-12">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Top Rated</SelectItem>
                    <SelectItem value="price-low">Price: Low → High</SelectItem>
                    <SelectItem value="price-high">Price: High → Low</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
                {canEdit && (
                  <Button onClick={openAdd} className="h-12 px-5 gradient-primary text-primary-foreground gap-2 font-semibold">
                    <Plus className="h-4 w-4" /> Add Hotel
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    activeFilters.includes(f.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {activeFilters.includes(f.id) && <X className="h-3 w-3" />}
                  {f.label}
                </button>
              ))}
              <span className="text-muted-foreground text-xs">|</span>
              {[3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setStarFilter(starFilter === s ? null : s)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    starFilter === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {s} <Star className="h-3 w-3 fill-current" />
                </button>
              ))}

              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="px-4 md:px-6 pt-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> hotels found
            {search && <span> for "<span className="font-medium">{search}</span>"</span>}
          </p>
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setActiveFilters([]); setStarFilter(null); }} className="text-xs text-primary">
              Clear all filters
            </Button>
          )}
        </div>
      </div>

      {/* Hotel Cards */}
      <div className="px-4 md:px-6 pb-6">
        <div className="max-w-5xl mx-auto">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
              {filtered.map((hotel, idx) => (
                <Card key={hotel.hotelId} className="group overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer" onClick={() => { setSelectedHotel(hotel); setDetailOpen(true); }}>
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={getHotelImage(idx)}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={hotel.status} />
                    </div>
                    <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors" onClick={e => e.stopPropagation()}>
                      <Heart className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {hotel.pricePerNight < 150 && (
                      <div className="absolute bottom-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded">
                        GREAT DEAL
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    {/* Title & Location */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold font-display text-sm line-clamp-1">{hotel.name}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {Array.from({ length: hotel.starRating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-3">
                      <MapPin className="h-3 w-3" />
                      <span className="text-xs">{hotel.city}, {hotel.country}</span>
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {hotel.amenities.slice(0, 3).map(a => (
                        <span key={a} className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">
                          {a}
                        </span>
                      ))}
                      {hotel.amenities.length > 3 && (
                        <span className="text-[10px] text-primary font-medium">+{hotel.amenities.length - 3} more</span>
                      )}
                    </div>

                    {/* Rating & Price Row */}
                    <div className="flex items-end justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {getReviewScore(hotel.starRating)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{getReviewLabel(hotel.starRating)}</p>
                          <p className="text-[10px] text-muted-foreground">{getReviewCount(idx).toLocaleString()} reviews</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">per night</p>
                        <p className="text-lg font-bold text-primary font-display">${hotel.pricePerNight}</p>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {canEdit && (
                      <div className="flex gap-1.5 mt-3 pt-3 border-t">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={e => { e.stopPropagation(); openEdit(hotel); }}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={e => { e.stopPropagation(); setHotels(prev => prev.filter(h => h.hotelId !== hotel.hotelId)); toast.success("Hotel deleted"); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-3 mt-4">
              {filtered.map((hotel, idx) => (
                <Card key={hotel.hotelId} className="group overflow-hidden border shadow-card hover:shadow-elevated transition-all cursor-pointer" onClick={() => { setSelectedHotel(hotel); setDetailOpen(true); }}>
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full sm:w-64 h-48 sm:h-auto shrink-0 overflow-hidden">
                      <img src={getHotelImage(idx)} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 left-2"><StatusBadge status={hotel.status} /></div>
                    </div>
                    <CardContent className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h3 className="font-semibold font-display">{hotel.name}</h3>
                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span className="text-xs">{hotel.city}, {hotel.country}</span>
                              <span className="mx-1">·</span>
                              <div className="flex">{Array.from({ length: hotel.starRating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-warning text-warning" />)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary font-display">${hotel.pricePerNight}</p>
                            <p className="text-[10px] text-muted-foreground">per night</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {hotel.amenities.slice(0, 5).map(a => (
                            <span key={a} className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">{a}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{getReviewScore(hotel.starRating)}</div>
                          <span className="text-xs font-medium">{getReviewLabel(hotel.starRating)}</span>
                          <span className="text-[10px] text-muted-foreground">({getReviewCount(idx).toLocaleString()} reviews)</span>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); openEdit(hotel); }}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={e => { e.stopPropagation(); setHotels(prev => prev.filter(h => h.hotelId !== hotel.hotelId)); toast.success("Hotel deleted"); }}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <BedDouble className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No hotels found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Hotel Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedHotel && (
            <>
              <div className="relative h-56 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg">
                <img src={getHotelImage(hotels.indexOf(selectedHotel))} alt={selectedHotel.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h2 className="text-xl font-bold font-display">{selectedHotel.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">{Array.from({ length: selectedHotel.starRating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}</div>
                    <span className="text-white/80 text-sm">· {selectedHotel.city}, {selectedHotel.country}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {getReviewScore(selectedHotel.starRating)}
                    </div>
                    <div>
                      <p className="font-semibold">{getReviewLabel(selectedHotel.starRating)}</p>
                      <p className="text-xs text-muted-foreground">{getReviewCount(hotels.indexOf(selectedHotel)).toLocaleString()} reviews</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary font-display">${selectedHotel.pricePerNight}</p>
                    <p className="text-xs text-muted-foreground">per night · {selectedHotel.rooms} rooms available</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Amenities</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedHotel.amenities.map(a => (
                      <div key={a} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                          {AMENITY_ICONS[a] ? (() => { const Icon = AMENITY_ICONS[a]; return <Icon className="h-3.5 w-3.5" />; })() : <BedDouble className="h-3.5 w-3.5" />}
                        </div>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <StatusBadge status={selectedHotel.status} />
                </div>

                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => { setDetailOpen(false); openEdit(selectedHotel); }}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit Hotel
                    </Button>
                    <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Hotel' : 'Add Hotel'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Stars</Label><Input type="number" min={1} max={5} value={form.starRating} onChange={e => setForm(p => ({ ...p, starRating: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Price/Night ($)</Label><Input type="number" value={form.pricePerNight || ''} onChange={e => setForm(p => ({ ...p, pricePerNight: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Total Rooms</Label><Input type="number" value={form.rooms || ''} onChange={e => setForm(p => ({ ...p, rooms: Number(e.target.value) }))} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as 'active' | 'inactive' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="flex gap-2">
                <Input value={amenityInput} onChange={e => setAmenityInput(e.target.value)} placeholder="e.g. WiFi" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (amenityInput.trim()) { setForm(p => ({ ...p, amenities: [...p.amenities, amenityInput.trim()] })); setAmenityInput(''); } } }} />
                <Button variant="outline" type="button" onClick={() => { if (amenityInput.trim()) { setForm(p => ({ ...p, amenities: [...p.amenities, amenityInput.trim()] })); setAmenityInput(''); } }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">{form.amenities.map((a, i) => <Badge key={i} variant="secondary" className="gap-1">{a}<button onClick={() => setForm(p => ({ ...p, amenities: p.amenities.filter((_, idx) => idx !== i) }))} className="ml-1">×</button></Badge>)}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Add Hotel'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
