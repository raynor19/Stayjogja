const fs = require('fs');
let admin = fs.readFileSync('src/routes/adminRoutes.js', 'utf8');

const target = `const ownedProps = db.properties.filter(p => p.owner_id === u.id);
        activityMeta = {
          totalProperties: ownedProps.length,
          propertyNames: ownedProps.map(p => p.name).join(', ')
        };`;

const replace = `const ownedProps = db.properties.filter(p => p.owner_id === u.id);
        const propIds = ownedProps.map(p => p.id);
        const ownerBookings = db.reservations.filter(r => propIds.includes(r.property_id) && ['terkonfirmasi', 'selesai_checkin', 'aktif'].includes(r.status));
        const totalRevenue = ownerBookings.reduce((sum, b) => {
          let val = b.total_price || 0;
          if (b.settlement_status === 'selesai') val = val - Math.round(val * 0.05);
          return sum + val;
        }, 0);
        activityMeta = {
          totalProperties: ownedProps.length,
          propertyNames: ownedProps.map(p => p.name).join(', '),
          totalRevenue: totalRevenue
        };`;

admin = admin.replace(target, replace);
fs.writeFileSync('src/routes/adminRoutes.js', admin);
