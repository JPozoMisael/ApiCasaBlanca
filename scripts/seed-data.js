/*
| Datos de arranque del marketplace de Salinas.
|
| ATENCIÓN: las coordenadas son APROXIMADAS (sirven para ubicar la zona en un mapa, no para navegación).
| Los hoteles marcados con `real: true` corresponden a las propiedades del proyecto original y usan sus
| fotos; sus tipos de habitación y precios son de EJEMPLO y deben ajustarse desde el panel.
| El resto de hoteles son ficticios, solo para desarrollo/demos (`npm run db:seed:demo`).
*/

const ZONAS = [
  { nombre: 'Salinas Centro', parroquia: 'Salinas', lat: -2.2147, lng: -80.9540, orden: 1,
    descripcion: 'El malecón, la vida nocturna, restaurantes y el ambiente urbano de Salinas.' },
  { nombre: 'Chipipe', parroquia: 'Salinas', lat: -2.2075, lng: -80.9560, orden: 2,
    descripcion: 'Playa tranquila de aguas calmadas junto a la Base Naval, ideal para familias.' },
  { nombre: 'Las Palmeras', parroquia: 'Salinas', lat: -2.2210, lng: -80.9660, orden: 3,
    descripcion: 'Sector residencial frente al mar, cerca del malecón y de la zona gastronómica.' },
  { nombre: 'Puerto Lucía', parroquia: 'Salinas', lat: -2.2020, lng: -80.9470, orden: 4,
    descripcion: 'Zona de marina y yates, con edificios de departamentos y club náutico.' },
  { nombre: 'Mar Bravo', parroquia: 'Salinas', lat: -2.2100, lng: -80.9750, orden: 5,
    descripcion: 'Playa abierta de olas fuertes, popular entre surfistas y buscadores de tranquilidad.' },
  { nombre: 'Punta Carnero', parroquia: 'Salinas', lat: -2.2880, lng: -80.9350, orden: 6,
    descripcion: 'Kilómetros de playa amplia al sur de Salinas, con hosterías y cabañas frente al mar.' },
  { nombre: 'Anconcito', parroquia: 'Anconcito', lat: -2.3170, lng: -80.8830, orden: 7,
    descripcion: 'Puerto pesquero tradicional: pesca artesanal, cebiche fresco y precios más bajos.' },
  { nombre: 'Muey', parroquia: 'José Luis Tamayo', lat: -2.2140, lng: -80.9090, orden: 8,
    descripcion: 'Playa amplia y tranquila, con balnearios y hospedaje familiar.' },
  { nombre: 'Ballenita', parroquia: 'Santa Elena (limítrofe)', lat: -2.2000, lng: -80.8570, orden: 9,
    descripcion: 'Mirador natural con atardeceres frente al mar, en el límite con el cantón Santa Elena.' },
];

const AMENIDADES = [
  ['wifi', 'WiFi gratis', 'wifi-outline', 'general'],
  ['piscina', 'Piscina', 'water-outline', 'exterior'],
  ['aire-acondicionado', 'Aire acondicionado', 'snow-outline', 'habitacion'],
  ['frente-al-mar', 'Frente al mar', 'sunny-outline', 'exterior'],
  ['acceso-playa', 'Acceso directo a la playa', 'walk-outline', 'exterior'],
  ['restaurante', 'Restaurante', 'restaurant-outline', 'servicio'],
  ['bar', 'Bar', 'beer-outline', 'servicio'],
  ['desayuno', 'Desayuno incluido', 'cafe-outline', 'servicio'],
  ['parqueadero', 'Parqueadero', 'car-outline', 'general'],
  ['recepcion-24h', 'Recepción 24 horas', 'time-outline', 'servicio'],
  ['aptos-familias', 'Apto para familias', 'people-outline', 'general'],
  ['mascotas', 'Admite mascotas', 'paw-outline', 'general'],
  ['terraza', 'Terraza', 'sunny-outline', 'exterior'],
  ['cocina', 'Cocina equipada', 'flame-outline', 'habitacion'],
  ['tv-cable', 'TV por cable', 'tv-outline', 'habitacion'],
  ['agua-caliente', 'Agua caliente', 'thermometer-outline', 'habitacion'],
  ['balcon', 'Balcón', 'home-outline', 'habitacion'],
  ['spa', 'Spa', 'leaf-outline', 'servicio'],
  ['gimnasio', 'Gimnasio', 'barbell-outline', 'servicio'],
  ['lavanderia', 'Lavandería', 'shirt-outline', 'servicio'],
  ['transporte', 'Transporte / traslados', 'bus-outline', 'servicio'],
  ['accesible', 'Accesible para silla de ruedas', 'accessibility-outline', 'accesibilidad'],
];

const img = (n) => `assets/img/${encodeURI(n)}`;

const HOTELES = [
  {
    real: true,
    nombre: 'Casa Blanca',
    zona: 'chipipe',
    tipo_alojamiento: 'hotel',
    estrellas: 4,
    destacado: true,
    direccion: 'Chipipe, Salinas',
    telefono: null,
    descripcion:
      'Casa Blanca ofrece habitaciones amplias con vista al mar en Chipipe, terraza con jacuzzi y acceso rápido a la playa. ' +
      'Un lugar tranquilo para descansar en familia o en pareja.',
    politica_cancelacion: 'moderada',
    amenidades: ['wifi', 'aire-acondicionado', 'frente-al-mar', 'acceso-playa', 'terraza', 'parqueadero', 'tv-cable', 'agua-caliente', 'aptos-familias'],
    imagenes: [
      ...Array.from({ length: 24 }, (_, i) => img(`${i + 1}.PNG`)),
      img('25.jpeg'), img('26.jpeg'), img('27.jpeg'),
    ],
    tipos: [
      { nombre: 'Habitación Doble', capacidad: 2, base: 55, sencillas: 0, dobles: 1, n: 5, vista: false },
      { nombre: 'Habitación Familiar', capacidad: 4, base: 85, sencillas: 2, dobles: 1, n: 4, vista: false },
      { nombre: 'Suite Frente al Mar', capacidad: 3, base: 120, sencillas: 0, dobles: 1, n: 3, vista: true, balcon: true },
    ],
  },
  {
    real: true,
    nombre: 'Casa Ballenita',
    zona: 'ballenita',
    tipo_alojamiento: 'hosteria',
    estrellas: 4,
    direccion: 'Ballenita',
    descripcion:
      'Casa con jardines, zona BBQ y áreas sociales a pocos pasos del mirador de Ballenita. Ideal para grupos y familias que buscan espacio y privacidad.',
    politica_cancelacion: 'flexible',
    amenidades: ['wifi', 'aire-acondicionado', 'parqueadero', 'aptos-familias', 'terraza', 'cocina', 'mascotas'],
    imagenes: Array.from({ length: 13 }, (_, i) => img(`${i + 28} ballenita.jpeg`).replace('34%20ballenita.jpeg', '34%20ballenitajpeg.jpeg')),
    tipos: [
      { nombre: 'Habitación Estándar', capacidad: 2, base: 45, sencillas: 0, dobles: 1, n: 4 },
      { nombre: 'Habitación Cuádruple', capacidad: 4, base: 75, sencillas: 2, dobles: 1, n: 3 },
    ],
  },

  // ---- Ficticios (solo con --demo) ----
  {
    nombre: 'Hotel Brisas del Pacífico',
    zona: 'salinas-centro',
    tipo_alojamiento: 'hotel',
    estrellas: 4,
    destacado: true,
    direccion: 'Malecón, Salinas',
    descripcion: 'Hotel frente al malecón con piscina, restaurante y habitaciones con balcón hacia el mar.',
    politica_cancelacion: 'moderada',
    amenidades: ['wifi', 'piscina', 'aire-acondicionado', 'frente-al-mar', 'restaurante', 'bar', 'desayuno', 'recepcion-24h', 'parqueadero', 'balcon'],
    tipos: [
      { nombre: 'Estándar Doble', capacidad: 2, base: 70, sencillas: 0, dobles: 1, n: 8 },
      { nombre: 'Superior con Balcón', capacidad: 3, base: 105, sencillas: 1, dobles: 1, n: 6, vista: true, balcon: true },
      { nombre: 'Suite Familiar', capacidad: 5, base: 160, sencillas: 3, dobles: 1, n: 3, vista: true },
    ],
  },
  {
    nombre: 'Puerto Lucía Suites',
    zona: 'puerto-lucia',
    tipo_alojamiento: 'apart_hotel',
    estrellas: 5,
    direccion: 'Puerto Lucía, Salinas',
    descripcion: 'Departamentos completos con cocina, vista a la marina, piscina, gimnasio y spa.',
    politica_cancelacion: 'estricta',
    amenidades: ['wifi', 'piscina', 'aire-acondicionado', 'frente-al-mar', 'cocina', 'gimnasio', 'spa', 'parqueadero', 'recepcion-24h', 'accesible'],
    tipos: [
      { nombre: 'Suite 1 Dormitorio', capacidad: 3, base: 130, sencillas: 1, dobles: 1, n: 6, vista: true },
      { nombre: 'Suite 2 Dormitorios', capacidad: 6, base: 210, sencillas: 2, dobles: 2, n: 4, vista: true, balcon: true },
    ],
  },
  {
    nombre: 'Cabañas Mar Bravo',
    zona: 'mar-bravo',
    tipo_alojamiento: 'cabana',
    estrellas: 3,
    direccion: 'Vía a La Chocolatera, Mar Bravo',
    descripcion: 'Cabañas rústicas a pasos de la playa, con hamacas, BBQ compartido y ambiente relajado para surfistas.',
    politica_cancelacion: 'flexible',
    amenidades: ['wifi', 'acceso-playa', 'terraza', 'mascotas', 'parqueadero', 'agua-caliente'],
    tipos: [
      { nombre: 'Cabaña Pareja', capacidad: 2, base: 40, sencillas: 0, dobles: 1, n: 5 },
      { nombre: 'Cabaña Familiar', capacidad: 5, base: 80, sencillas: 3, dobles: 1, n: 3 },
    ],
  },
  {
    nombre: 'Hostería Punta Carnero Lodge',
    zona: 'punta-carnero',
    tipo_alojamiento: 'hosteria',
    estrellas: 4,
    direccion: 'Vía Punta Carnero',
    descripcion: 'Hostería frente a una de las playas más amplias de la península, con piscina, restaurante y jardines.',
    politica_cancelacion: 'moderada',
    amenidades: ['wifi', 'piscina', 'frente-al-mar', 'acceso-playa', 'restaurante', 'desayuno', 'parqueadero', 'aptos-familias', 'aire-acondicionado'],
    tipos: [
      { nombre: 'Habitación Vista Jardín', capacidad: 2, base: 65, sencillas: 0, dobles: 1, n: 6 },
      { nombre: 'Habitación Frente al Mar', capacidad: 3, base: 95, sencillas: 1, dobles: 1, n: 5, vista: true, balcon: true },
    ],
  },
  {
    nombre: 'Hostal Las Palmeras Beach',
    zona: 'las-palmeras',
    tipo_alojamiento: 'hostal',
    estrellas: 3,
    direccion: 'Av. Las Palmeras, Salinas',
    descripcion: 'Hostal económico y limpio, a dos cuadras de la playa. Ideal para viajeros y grupos de amigos.',
    politica_cancelacion: 'flexible',
    amenidades: ['wifi', 'aire-acondicionado', 'agua-caliente', 'tv-cable', 'lavanderia'],
    tipos: [
      { nombre: 'Habitación Simple', capacidad: 1, base: 22, sencillas: 1, dobles: 0, n: 4 },
      { nombre: 'Habitación Doble', capacidad: 2, base: 35, sencillas: 0, dobles: 1, n: 6 },
      { nombre: 'Habitación Triple', capacidad: 3, base: 48, sencillas: 1, dobles: 1, n: 3 },
    ],
  },
  {
    nombre: 'Hotel Anconcito Bay',
    zona: 'anconcito',
    tipo_alojamiento: 'hotel',
    estrellas: 3,
    direccion: 'Malecón de Anconcito',
    descripcion: 'Hotel sencillo frente al puerto pesquero. Restaurante de mariscos frescos y precios accesibles.',
    politica_cancelacion: 'moderada',
    amenidades: ['wifi', 'restaurante', 'parqueadero', 'aire-acondicionado', 'tv-cable'],
    tipos: [
      { nombre: 'Habitación Doble', capacidad: 2, base: 30, sencillas: 0, dobles: 1, n: 6 },
      { nombre: 'Habitación Familiar', capacidad: 4, base: 55, sencillas: 2, dobles: 1, n: 3 },
    ],
  },
];

const RESENAS_DEMO = [
  [9, 'Excelente ubicación', 'Todo muy limpio y el personal fue amable. Volveríamos sin dudarlo.'],
  [8, 'Muy buena estadía', 'Cómodo y tranquilo, cerca de la playa. El desayuno podría variar más.'],
  [10, 'Perfecto para descansar', 'Superó nuestras expectativas, las vistas son increíbles.'],
  [7, 'Buena relación precio-calidad', 'Habitaciones sencillas pero limpias. Buena atención.'],
  [9, 'Recomendado', 'Atención personalizada y muy buen ambiente familiar.'],
];

module.exports = { ZONAS, AMENIDADES, HOTELES, RESENAS_DEMO };
