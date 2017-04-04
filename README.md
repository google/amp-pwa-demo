# AMP+PWA Demo for Blog and News Sites

A simple, dependency-free blog that uses a
[Progressive Web App](https://developers.google.com/web/progressive-web-apps/)
(PWA) to show [Accelerated Mobile Pages](https://www.ampproject.org/) (AMP).
__This is not an official Google product.__


## Setup

This project requires [Node.js](https://nodejs.org/en/download/) and [NPM](https://www.npmjs.com/).

In the root of this repo, run `npm install` to download all dependencies, and
then `npm start` to start the server. You can visit the site at
[localhost:8080](http://localhost:8080).

Note that this is just a _demo site_. Some features (e.g. push notifications)
require a more complex backend that is not implemented here.


## Implementation Details

Our site uses AMP and PWA to create a site that loads as fast as possible, while
still allowing users to take advantage of some of the most recent web platform
features like push notifications and offline browsing.

The front end consists of three main components:

- __AMP templates__: All pages are valid AMP pages. We'll only have to maintain
  a single set of templates (rather than a conventional version and a separate
  AMP version).
- __[App Shell](https://developers.google.com/web/fundamentals/architecture/app-shell)__:
  This is an empty HTML page that contains some scripts to download content.
- __[Service Worker](https://developers.google.com/web/fundamentals/getting-started/primers/service-workers)__

The first pageview will always be an AMP page. If visitors are coming from
Google search results, this page will be loaded directly from the [Google AMP
cache](https://developers.google.com/amp/cache/overview). In the background,
the AMP page will install the service worker, which in turn will cache the app
shell page and some other resources.

Any further pageview will be intercepted by the service worker. It returns the
app shell, rather than the requested page, and the app shell will then load the
actual content using AJAX.

While the content shown inside the app shell is still valid AMP, we can now use
custom JavaScript to add functionality that is not (yet) supported by AMP. Note
however that this functionality will not be available on the first pageview, or
in browsers that don't support service workers. The App Shell can also intercept
link clicks and use the web history API to create a "single page app".
