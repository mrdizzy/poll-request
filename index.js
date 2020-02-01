var request_promise = require("request-promise-native");

/** 
 * A wrapper for the request module that will poll a URL a specific number of times
 * or until a condition of the response is met. Useful for when you have sent a request
 * to an external API which takes a limited but unknown time to process and requires 
 * polling until the result is available 
 * @constructor
 */
class PollRequest {
  /**
   * Create an instance of a request 
   * @param {number} first_poll - The number of milliseconds before sending the first request
   * @param {number} second_poll - The number of milliseconds before sending the second request_promise
   * @param {number} subsequent_polls - A number less than 1, acting as an exponential multiplier for the second_poll query, so that there is an increasing delay between each 
   * subsequent request. For example, this defaults to 0.1,and if second_poll is 1000, then the delay before the next poll will be 1100, then the next delay will be 1210.
   * This is to prevent you "spamming" the source server with hundreds of consecutive responses. The smaller the number, the smaller the delay between requests. 
   * @param {number} the number of attempts to make before returning an error, including the initial request. 
   */
  constructor(first_poll = 1000, second_poll = 500, subsequent_polls = 0.1, attempts = 20) {
    this.poll_options = {
      first_poll: first_poll,
      second_poll: second_poll,
      subsequent_polls: subsequent_polls,
      attempts: attempts
    }
  }

  /**
   * Create a request to a URL
   * @param {Object} request_options - These are the same options as the request module and will get passed to that module
   * @param {Object} poll_options - An object containing polling options specific for this request
   * @param {number} poll_options.first_poll - The number of milliseconds before sending the first request
   * @param {number} poll_options.second_poll - The number of milliseconds before sending the second request_promise
   * @param {number} poll_options.subsequent_polls - A number less than 1, acting as an exponential multiplier for the second_poll query, so that there is an increasing delay between each 
   * subsequent request. For example, this defaults to 0.1,and if second_poll is 1000, then the delay before the next poll will be 1100, then the next delay will be 1210.
   * @param {endRequestCallback} poll_options.callback - A function that gets passed the response and should return a true or false value. If true, polling requests will stop and the response will be returned. If false, the polling requests will continue. 
   */
  async request(request_options, poll_options) {
    
    this.current_poll_options = Object.assign({}, this.poll_options, poll_options);
    this.request_options = request_options;

    await this.sleep(this.current_poll_options.first_poll);
    this.attempts = 0;
    return this.subsequentPollRequests();
  }

  async subsequentPollRequests() {
    
    if(this.attempts == this.current_poll_options.attempts) {
      return Promise.reject("Failed after " + this.attempts + " attempts")
    }
    this.attempts += 1;
    
    let response = await request_promise(this.request_options);
    if (this.current_poll_options.callback) {
      if (this.current_poll_options.callback(response)) {
        return response;
      } else {
        await this.sleep(this.current_poll_options.second_poll);
        this.current_poll_options.second_poll += this.current_poll_options.second_poll * this.current_poll_options.subsequent_polls;
        return await this.subsequentPollRequests();
      }
    }
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = PollRequest;

/**
 * This is a user-defined callback that is passed the current response. You can then carry out checks on the 
 * response to determine whether you want to stop polling or continue polling. To stop polling this callback
 * should return a true value. 
 *
 * @callback endRequestCallback
 * @param {Object} response
 */