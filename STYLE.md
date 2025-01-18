#Style, copy and UX guidelines for frontend development

The style for our app is Ocean/Beach inspired (but not nautical) - we want to use a lot of gradients that we find in those environments - the sand, from wet to dry - the blue sky, sometimes with clouds - the sea, from calm to stormy.

We want to use a lot of gradients and pastel colors.

We want to use a lot of rounded corners and soft edges.

We want to use a lot of animations and transitions.

We want to use a lot of natural elements - plants, animals, sea shells, etc. - in our icons, illustrations, patterns and textures.

Any copy should be concise, clear and easy to understand - but also a bit whimsical and fun, and make use of emojis.

We want to employ thoughtful UX design - we want to make sure that the user experience is seamless and intuitive, and that the user is never lost or confused. Here are some of the 'UI states' we want to consider when creating our components - all of these states should be clear to the user through styling and copy.

    Loading:
        The state when data is being fetched or an action is in progress.
        Example: A spinner or skeleton screen.

    Empty:
        No content to display.
        Example: A message like "No items available" or a prompt to add content.

    Loaded:
        Data or content is fully available and displayed.
        Example: A populated list or page.

    Partially Loaded:
        Partial data or content is displayed while additional content loads.
        Example: Infinite scrolling or lazy loading images.

    Error:
        Something went wrong during a process (e.g., fetching data, submitting a form).
        Example: A message like "Failed to load data" or a retry button.
        note: we want to avoid using toasts and just show error messages in the main content area.

    Idle:
        No user interaction or activity is occurring.
        Example: A static welcome screen or a dashboard waiting for user input.

    Disabled:
        UI elements are inactive and cannot be interacted with.
        Example: A "Submit" button grayed out until all required fields are filled.

    Interactive:
        The UI is ready for user input or interaction.
        Example: A form or a drag-and-drop interface.

    Success/Confirmation:
        Indicates that a user action was completed successfully.
        Example: A "Thank you" message or a green checkmark.
        notes: we want to avoid using toasts and just show success messages in the main content area.

    Warning:
        Highlights a non-critical issue or potential risk.
        Example: A yellow alert about an expiring session.

    Onboarding/First-Time User Experience:
        Guided tutorials or prompts for new users, and help icons to explain how to use features.
        Example: Tooltips or modals explaining how to use features.

    Offline:
        The state when the app detects no internet connection.
        Example: A banner or placeholder indicating offline status.

    Updating:
        UI is being refreshed with new data or changes.
        Example: A spinner or subtle UI animation during updates.

    Focus:
        A particular element is selected or highlighted for user interaction.
        Example: A text field with a blinking cursor.

    Transitioning:
        The UI is between states, often accompanied by animations.
        Example: Page transitions or modal entry/exit animations.

##Notes

- We want a mobile-first approach - we want to make sure that the app is responsive and looks good on both mobile and desktop, but we want to prioritize mobile. Content needs to be hidden thoughtfully and easy to pop out and find for mobile users.
- If you would like to use a specific type of image or pattern, please prompt to user to supply it
