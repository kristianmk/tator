from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_schema
from ._errors import error_responses
from ._media_query import media_filter_parameter_schema
from ._attributes import attribute_filter_parameter_schema

boilerplate = dedent("""\
A media may be an image or a video. Media are a type of entity in Tator,
meaning they can be described by user defined attributes.
""")

class MediaListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateMedia'
        elif method == 'GET':
            operation['operationId'] = 'GetMediaList'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateMediaList'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteMediaList'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        short_desc = ''
        long_desc = ''
        if method == 'GET':
            short_desc = "Get media list."
        elif method == 'POST':
            short_desc = "Create media."
            long_desc = dedent("""\
            This method creates a `Media` object in the database. For images, the 
            media must already be uploaded and an upload URL must be provided, as
            well as the group and job IDs associated with the upload. For videos,
            it is recommended to use the `Transcode` endpoint, which will create
            the media object itself. This method is only needed for local 
            transcodes. In that case, it will create an empty Media object;
            thumbnails, streaming, and archival videos must be subsequently uploaded via
            tus. Videos must be  moved to the media folder using the `MoveVideo` endpoint, 
            which also calls the `Media` PATCH method to update the `media_files` field.
            Thumbnails may be saved by just using the `Media` PATCH method directly.
            """)
        elif method == 'PATCH':
            short_desc = "Update media list."
            long_desc = dedent("""\
            This method does a bulk update on all media matching a query. Only 
            user-defined attributes may be bulk updated.
            """)
        elif method == 'DELETE':
            short_desc = "Delete media list."
            long_desc = dedent("""\
            This method performs a bulk delete on all media matching a query. It is 
            recommended to use a GET request first to check what is being deleted.
            """)
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        params = []
        if method in ['GET', 'PATCH', 'DELETE']:
            params = media_filter_parameter_schema + attribute_filter_parameter_schema
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/MediaSpec'},
            }}}
        elif method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {
                    '$ref': '#/components/schemas/AttributeBulkUpdate',
                },
                'examples': {
                    'single': {
                        'summary': 'Update Species attribute of many images',
                        'value': {
                            'attributes': {
                                'Species': 'Tuna',
                            }
                        },
                    },
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = message_with_id_schema('media')
        elif method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of media list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/Media'},
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'media list')
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'media list')
        return responses

class MediaDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetMedia'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateMedia'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteMedia'
        operation['tags'] = ['Tator']
        return operation

    def get_description(self, path, method):
        short_desc = ''
        long_desc = ''
        if method == 'GET':
            short_desc = "Get media."
        elif method == 'PATCH':
            short_desc = "Update media."
        elif method == 'DELETE':
            short_desc = "Delete media."
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a media.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {
                'required': True,
                'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/MediaUpdate'},
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of media.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/Media',
                }}},
            }
        if method == 'PATCH':
            responses['200'] = message_schema('update', 'media')
        if method == 'DELETE':
            responses['200'] = message_schema('deletion', 'media')
        return responses

