# dapp Tests

This directory contains the dapp widget tests.

##### Table of content

- [Directory stucture](#directory-structure)
- [Initial setup](#initial-setup)
- [Running the tests](#running-the-tests)
- [Writing tests](#writing-tests)

## Directory Structure

dapp has two sets of automated tests, implemented using [the Intern](https://github.com/theintern/intern):

- `Unit tests`, that are under the [unit](./unit) directory. The [unit/all.js](./unit/all.js) file references all the available unit tests.
- `Functional tests` (webdriver tests), that are under the [functional](./functional) directory. The [functional/all.js](./functional/all.js) file references all the available functional tests.

The unit tests are lightweight, run inside a browser page and do not simulate real interaction between a user and the browser window.
The functional tests, in comparison, takes longer to run but do simulate real interactions between a user and the browser window.

Two configuration files defines the two [intern configurations](https://github.com/theintern/intern/wiki/Configuring-Intern) that are available to run the automated tests from the command line:
- [intern.local.js](./intern.local.js) define a configuration that runs the tests locally, on you computer.
- [intern.js](./intern.js) define a configuration that runs the tests on [Sauce Labs](https://saucelabs.com/), providing that you have a valid Sauce Labs use account.

Note that as intern provides an in browser runner for the unit tests, you can also run the unit tests in a browser without using the command line.
This last configuration is defined in the [intern.browser.js](./intern.browser.js) file.

## Initial Setup

To be able to run the dapp automated tests, you need to:

1. Install the Intern
2. If running the tests on Sauce Labs, create an account and setup your environment to use it (Untested for dapp)
3. If running the tests locally, you will have to install [selenium](http://www.seleniumhq.org/) and drivers for the browsers that you want to use

#### Installing the Intern

To install the Intern for the dapp project, you need to run the following command in the dapp home directory:

```
$ npm install
```

That will install all the dependencies of dapp, including the Intern. You only need to run this command once.

#### Sauce Labs configuration (Untested for dapp)

If you don't already have a Sauce Labs account, you can create one on their website, choosing the scheme that best fit your situation (Note that they ofer a free one for OSS developpers, [Open Sauce](https://saucelabs.com/opensauce)):

1. Navigate to https://saucelabs.com/signup in your browser;
2. Select the subscription plan you want and fill up the form to create your account.

Once your account has been created, setup your `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` environment variables as they are listed
on
setup your SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables as they are listed
on https://saucelabs.com/appium/tutorial/3.

#### Selenium / Webdriver installation

To run the tests locally (which is faster than running the tests on Sauce Labs but restricts the list of browsers the test run into to the list of browsers
that are installed on your computer), you first need to install the following resources:

1. Java JRE version 6
1. From the [Selenium download page](http://www.seleniumhq.org/download/):
  1. Selenium Server
  1. Drivers for the browsers installed on your computer. After you've downloaded the browser drivers, make sure that they are referenced in your $PATH (or %PATH% on Windows):
    1. Firefox driver: included with Selenium Server, no extra download needed
    1. Internet explorer driver: use the link provided in section _The Internet Explorer Driver Server_ of http://www.seleniumhq.org/download/
    1. Chrome driver: https://code.google.com/p/chromedriver/
    1. Safari driver: included with Selenium Server, no extra download needed

## Running the tests

You have three options to run the tests:

1. Run the unit tests in a single browser
1. Run both unit and functional tests locally in desktop browsers
1. Run both unit and functional tests in Sauce Labs browsers (Untested for dapp)

When running tests using the command line, you can also adjust the list of reports generated for the test execution.

### Running the unit tests in a browser

To run the unit tests in a single browser, make sure that your `dapp` checkout is accessible through a web server at `http://SERVER:PORT/PATH` and open the following URL in a test browser:

```
http://SERVER:PORT/PATH/node_modules/intern/client.html?config=tests/intern.browser
```

Note that this won't run the functional tests, and that you will have to check the browser javascript console to get the tests execution result.

### Running the unit and functional tests locally in desktop browsers

1. Starts the selenium server on the default port (4444) (requires selenium server. See [installation instructions](#selenium--webdriver-installation)):

On Mac/Linux:

   ```
   $ java -jar selenium-server-standalone-2.XX.0.jar
   ```

2. Edit the [intern.local.js](./intern.local.js) configuration to list which browsers to use for the tests

3. In the dapp directory, type the following command: (There is an open issue with FF and IE)

   ```
   $ grunt test:local
   ```

### Running the unit and functional tests in Sauce Labs browsers (Untested for dapp)

In the dapp directory, type the following command:

```
$ grunt test:remote
```

Note that you can update the [intern.js](./intern.js) configuration file if you need to customize the list of browsers to run the tests into.

To monitor the tests execution and access the Sauce Labs reports, you will need to [login to Sauce Labs](https://saucelabs.com/login).

### Adjusting reports

Optional reports can be added via grunt flags e.g.

    $ grunt test:local:console // run the console reporter for a local test
    $ grunt test:remote:lcovhtml // run the console reporter for a remote (saucelabs) test with the lcovhtml coverage reporter
    $ grunt test:local:console:lcovhtml // multiple reporters can be specified

The following reporters are currently provided as optional flags
   * `lcovhtml`: this HTML report is generated at `dapp/html-report/index.html` and provides detailed information about what sections of the widgets code are executed during the tests and, more importantly, what sections are not.
   * `console`

## Writing tests

WORK IN PROGRESS (see https://github.com/theintern/intern/wiki/Writing-Tests-With-Intern for a general heads up on writing tests with the Intern).
