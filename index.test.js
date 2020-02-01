var request = require('request');
var PollHttp = require('./index.js');
var fixtures = require("./test/fixtures.js");

jest.mock('request');
jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllTimers();
  request.mockRestore();
});

test('test defaults set correctly', async () => {
  var poll_http = new PollHttp(500, 50, 0.9);
  expect(poll_http.poll_options.first_poll).toBe(500);
  expect(poll_http.poll_options.second_poll).toBe(50);
  expect(poll_http.poll_options.subsequent_polls).toBe(0.9);
})

test("tests callback ends polling", async () => {
  request.mockResolvedValueOnce(fixtures.image_uploaded_successfully_response).
  mockResolvedValueOnce(fixtures.image_waiting_processing_response)
  var poll_http = new PollHttp(100, 5, 0.9);
  let result = poll_http.request({
    url: "http://any.url"
  }, {
    callback: result => {
      return (result.status == "pending");
    }
  })
  await moveTimersForward(2);
  return result.then(data => {
    expect(data).toEqual(fixtures.image_waiting_processing_response)
  });
})

test("timeout after certain number of tries", async () => {
  for (let i = 0; i < 10; i++) {
    request.mockResolvedValue(fixtures.image_waiting_processing_response);
  }

  var poll_http = new PollHttp(100, 50, 0.9, 5);
  let result = poll_http.request({
    url: "http://any.url"
  }, {
    callback: (r) => {
    }
  }).catch(err => {
    expect(err).toEqual("Failed after 5 attempts");
  })

  await moveTimersForward(7);

  return new Promise(r => r(true));
})

test('tests polling of resource', async () => {
  var poll_http = new PollHttp(500, 50, 0.9, 8);
  request.mockResolvedValueOnce(fixtures.image_uploaded_successfully_response).
  mockResolvedValueOnce(fixtures.image_waiting_processing_response).
  mockResolvedValueOnce(fixtures.image_waiting_processing_response).
  mockResolvedValueOnce(fixtures.image_waiting_processing_response).
  mockResolvedValue(fixtures.image_waiting_processing_response).
  mockResolvedValue(fixtures.final_results_response)

  let result = poll_http.request({
    url: "http://www.google.com"
  }, {
    callback: result => {
      return (result.status == "done");
    }
  })

  expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 500);

  await moveTimersForward();
  expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 50);

  await moveTimersForward();
  expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 95);

  await moveTimersForward();
  expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 180.5);

  await moveTimersForward();
  expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 342.95000000000005);

  await moveTimersForward();
  return result;
});

function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

async function moveTimersForward(n = 1) {
  for (let i = 0; i < n; i++) {
    jest.runOnlyPendingTimers();
    await flushPromises();
  }
}