package org.nexus.admissions.exception;

/**
 * Raised when a call to an upstream dependency (NAP-Backend) fails.
 *
 * <p>This is deliberately distinct from a plain RuntimeException: an upstream
 * failure is a server-side fault (502), never a client error (400). Previously
 * every RuntimeException was mapped to 400, which made an authentication
 * failure between the dashboard backend and NAP-Backend look like the browser
 * had sent a bad request.
 */
public class UpstreamServiceException extends RuntimeException {

    public UpstreamServiceException(String message) {
        super(message);
    }

    public UpstreamServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}