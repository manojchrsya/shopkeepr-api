module.exports = [{
  template: {
    method: 'GET',
    url: `${process.env.API_END_POINT}/Brands/suggest`,
    query: {
      q: '{q:string}',
      partNumber: '{partNumber:string}',
      vehicleType: '{vehicleType:string}',
    },
    options: {
      useQuerystring: true,
    },
  },
  functions: {
    brandsuggest: ['q', 'partNumber', 'vehicleType'],
  },
}, {
  template: {
    method: 'GET',
    url: `${process.env.API_END_POINT}/Parts/suggest`,
    query: {
      q: '{q:string}',
      vehicleType: '{vehicleType:string}',
    },
    options: {
      useQuerystring: true,
    },
  },
  functions: {
    suggest: ['q', 'vehicleType'],
  },
}, {
  template: {
    method: 'POST',
    url: `${process.env.API_END_POINT}/PartNumbers/partFinder`,
    body: '{options:object}',
  },
  functions: {
    partFinder: ['options'],
  },
},
{
  template: {
    method: 'GET',
    url: `${process.env.API_END_POINT}/Workshops/getListing`,
    query: {
      filter: '{filter:object}',
    },
    options: {
      useQuerystring: false,
    },
  },
  functions: {
    getListing: ['filter'],
  },
},
{
  template: {
    method: 'GET',
    url: `${process.env.API_END_POINT}/Pincodes/getDetails`,
    query: {
      filter: '{filter:object}',
    },
    options: {
      useQuerystring: false,
    },
  },
  functions: {
    getDetails: ['filter'],
  },
}, {
  template: {
    method: 'POST',
    url: `${process.env.API_END_POINT}/PartRates/updateDetails`,
    body: '{options:object}',
  },
  functions: {
    updateDetails: ['options'],
  },
},
];
