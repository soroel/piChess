module.exports = {
  presets: [
    [
      'react-app',
      {
        targets: {
          browsers: [
            '>0.2%',
            'not dead',
            'not op_mini all',
            'not ie > 0',
            'not ie_mob > 0',
            'not op_mob > 0',
            'not op_mini > 0'
          ]
        }
      }
    ]
  ]
};
