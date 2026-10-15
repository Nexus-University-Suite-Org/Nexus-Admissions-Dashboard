package org.nexus.admissions.exception;

/**
 * Thrown when credentials are absent, malformed, or do not match.
 *
 * Mapped to 401 by {@code GlobalExceptionHandler}. Authentication failures
 * used to be raised as bare {@code RuntimeException}, which the generic
 * handler reported as 400 Bad Request - a status that means "malformed
 * request" and so misrepresented a wrong password as a client bug.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}