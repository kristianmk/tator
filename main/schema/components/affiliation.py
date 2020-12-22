affiliation_properties = {
    'user': {
        'description': 'Unique integer identifying a user.',
        'type': 'integer',
        'minimum': 1,
    },
    'permission': {
        'description': 'User permission level for the organization.',
        'type': 'string',
        'enum': ['Member', 'Admin'],
    },
}

affiliation_spec = {
    'type': 'object',
    'properties': affiliation_properties,
}

affiliation_update = {
    'type': 'object',
    'properties': {
        'permission': affiliation_properties['permission'],
    },
}

affiliation = {
    'type': 'object',
    'description': 'Affiliation object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a affiliation.',
        },
        'user': affiliation_properties['user'],
        'permission': affiliation_properties['permission'],
        'organization': {
            'description': 'Unique integer identifying an organization.',
            'type': 'integer',
            'minimum': 1,
        },
    },
}

