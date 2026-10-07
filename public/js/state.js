// Global State Management for StayJogja
const State = {
  activeRole: 'user', // 'user' | 'owner' | 'admin'
  currentUser: null,
  filters: {
    type: 'all', // 'all', 'hotel', 'homestay', 'apartemen'
    stars: [], // [1, 2, 3, 4, 5]
    area: 'all',
    minPrice: null,
    maxPrice: null,
    facilities: [],
    search: '',
    sort: 'popular',
    capacity: null,
    rooms: null
  },
  searchForm: {
    area: '',
    checkIn: '',
    checkOut: '',
    nights: 1,
    guests: 1,
    adults: 1,
    children: 0,
    rooms: 1
  },
  currentProperty: null,
  activeBooking: null,
  activePayment: null,
  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
  },

  notify() {
    this.listeners.forEach(fn => fn(this));
  },

  setRole(role) {
    this.activeRole = role;
    this.notify();
  },

  setFilter(key, value) {
    this.filters[key] = value;
    this.notify();
  },

  resetFilters() {
    this.filters = {
      type: 'all',
      stars: [],
      area: 'all',
      minPrice: null,
      maxPrice: null,
      facilities: [],
      search: '',
      sort: 'popular'
    };
    this.notify();
  }
};
