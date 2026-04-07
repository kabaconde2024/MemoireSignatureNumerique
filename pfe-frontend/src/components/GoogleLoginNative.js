import React, { useEffect, useRef } from 'react';

const GoogleLoginNative = ({ onSuccess }) => {
    const googleBtnRef = useRef(null);

    useEffect(() => {
        /* global google */
        if (window.google) {
            google.accounts.id.initialize({
                client_id: "320659477478-00hgntilql2f933lr33go2tie7b5em2u.apps.googleusercontent.com",
                callback: onSuccess,
            });

            google.accounts.id.renderButton(googleBtnRef.current, {
                theme: "filled_black",
                size: "large",
                shape: "pill",
                width: "350" // Ajusté pour ton design "Vitre"
            });
        }
    }, [onSuccess]);

    return <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }}></div>;
};

export default GoogleLoginNative;