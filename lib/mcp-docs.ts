/**
 * The MCP surface, as the server publishes it.
 *
 * GENERATED — do not edit by hand. Run `node scripts/generate-mcp-docs.mjs` from the
 * CalendarSite directory after changing a tool on the backend, or the two will disagree.
 *
 * It is embedded in the sign-in page so an agent landing on the site can discover the API
 * without credentials, which is the same reason `tools/list` is public: the alternative is
 * an agent guessing at tool names and argument shapes.
 */

export const MCP_DOCS = {
  "protocolVersion": "2024-11-05",
  "server": {
    "name": "CalendarBackend",
    "version": "1.0.0"
  },
  "transport": {
    "method": "POST",
    "path": "/mcp",
    "contentType": "application/json",
    "note": "One JSON-RPC 2.0 request per HTTP request. No session, no streaming, no batch."
  },
  "methods": {
    "initialize": {
      "auth": false,
      "description": "Handshake. Returns the protocol version and capabilities."
    },
    "tools/list": {
      "auth": false,
      "description": "Enumerate the tools below. Readable without a token."
    },
    "tools/call": {
      "auth": true,
      "description": "Invoke one tool. Requires a bearer token, except for the two public tools."
    },
    "ping": {
      "auth": false,
      "description": "Liveness. Returns an empty result."
    }
  },
  "errorShape": {
    "jsonrpc": "2.0",
    "id": 1,
    "error": {
      "code": -32000,
      "message": "Missing token",
      "data": {
        "code": "UNAUTHENTICATED"
      }
    }
  },
  "tools": [
    {
      "name": "auth.register",
      "description": "Register a new user account.",
      "inputSchema": {
        "properties": {
          "email": {
            "type": "string"
          },
          "password": {
            "type": "string"
          }
        },
        "required": [
          "email",
          "password"
        ],
        "type": "object"
      },
      "public": true
    },
    {
      "name": "auth.login",
      "description": "Log in and receive a bearer token.",
      "inputSchema": {
        "properties": {
          "email": {
            "type": "string"
          },
          "password": {
            "type": "string"
          }
        },
        "required": [
          "email",
          "password"
        ],
        "type": "object"
      },
      "public": true
    },
    {
      "name": "resources.list",
      "description": "List active resources.",
      "inputSchema": {
        "properties": {},
        "type": "object"
      },
      "public": false
    },
    {
      "name": "appointments.create",
      "description": "Book an appointment.",
      "inputSchema": {
        "properties": {
          "date": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "endTime": {
            "type": "string"
          },
          "resourceId": {
            "type": "string"
          },
          "startTime": {
            "type": "string"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "resourceId",
          "title",
          "date",
          "startTime",
          "endTime"
        ],
        "type": "object"
      },
      "public": false
    },
    {
      "name": "appointments.cancel",
      "description": "Cancel an appointment.",
      "inputSchema": {
        "properties": {
          "appointmentId": {
            "type": "string"
          }
        },
        "required": [
          "appointmentId"
        ],
        "type": "object"
      },
      "public": false
    },
    {
      "name": "appointments.reschedule",
      "description": "Reschedule an appointment.",
      "inputSchema": {
        "properties": {
          "appointmentId": {
            "type": "string"
          },
          "date": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "endTime": {
            "type": "string"
          },
          "startTime": {
            "type": "string"
          },
          "title": {
            "type": "string"
          }
        },
        "required": [
          "appointmentId",
          "title",
          "date",
          "startTime",
          "endTime"
        ],
        "type": "object"
      },
      "public": false
    },
    {
      "name": "appointments.delete",
      "description": "Permanently delete an appointment. Admin accounts only.",
      "inputSchema": {
        "properties": {
          "appointmentId": {
            "type": "string"
          }
        },
        "required": [
          "appointmentId"
        ],
        "type": "object"
      },
      "public": false
    },
    {
      "name": "appointments.list",
      "description": "List appointments with optional filters. Appointments are visible to every authenticated user, not only their owner.",
      "inputSchema": {
        "properties": {
          "from": {
            "type": "string"
          },
          "resourceId": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "to": {
            "type": "string"
          },
          "userId": {
            "type": "string"
          }
        },
        "type": "object"
      },
      "public": false
    },
    {
      "name": "users.delete",
      "description": "Permanently delete a user account. Admin accounts only. An admin cannot delete their own account, and the last remaining admin cannot be deleted. The account's appointments are kept.",
      "inputSchema": {
        "properties": {
          "userId": {
            "type": "string"
          }
        },
        "required": [
          "userId"
        ],
        "type": "object"
      },
      "public": false
    }
  ]
} as const;
